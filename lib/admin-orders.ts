import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { serializeRecord } from "@/lib/serialize";
import { ORDER_STATUS_TRANSITIONS, TERMINAL_ORDER_STATUSES } from "@/lib/constants";
import { requestAppmaxRefund, appmaxEnabled, cents } from "@/lib/appmax";
import { sendOrderStatusEmail } from "@/lib/mail";
import type { OrderStatus } from "@/generated/prisma/enums";

export function serializeAdminOrder<T extends Record<string, unknown>>(order: T): T {
  return serializeRecord(order);
}

type StatusUpdateInput = {
  orderId: string;
  status: OrderStatus;
  cancelledReason?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

export async function updateOrderStatus(input: StatusUpdateInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: { select: { productId: true, variationId: true, quantity: true } },
    },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  const allowed = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (input.status !== order.status && !allowed.includes(input.status)) {
    throw new Error(
      `Não é possível mudar o status de "${order.status}" para "${input.status}".`,
    );
  }

  const now = new Date();
  const wasActive = !TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus);
  const becomingTerminal = TERMINAL_ORDER_STATUSES.includes(input.status);

  const data: Record<string, unknown> = {
    status: input.status,
    updatedAt: now,
  };

  if (input.status === "PAID" && !order.paidAt) data.paidAt = now;
  if (input.status === "SHIPPED" && !order.shippedAt) data.shippedAt = now;
  if (input.status === "DELIVERED" && !order.deliveredAt) data.deliveredAt = now;
  if (input.status === "CANCELLED") {
    data.cancelledAt = now;
    data.cancelledReason = input.cancelledReason?.trim() || null;
  }
  if (input.trackingCode !== undefined) data.trackingCode = input.trackingCode?.trim() || null;
  if (input.trackingUrl !== undefined) data.trackingUrl = input.trackingUrl?.trim() || null;

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.order.update({
      where: { id: order.id },
      data: data as never,
    });

    if (wasActive && becomingTerminal) {
      for (const item of order.items) {
        if (!item.productId) continue;
        if (item.variationId) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            type: input.status === "REFUNDED" ? "RETURN" : "RELEASED",
            orderId: order.id,
            note:
              input.status === "REFUNDED"
                ? "Estoque devolvido após reembolso"
                : "Estoque liberado após cancelamento",
          },
        });
      }
    }

    return saved;
  });

  await auditLog({
    userId: input.actor.id,
    action: "ORDER_STATUS_UPDATE",
    entityType: "Order",
    entityId: order.id,
    details: {
      from: order.status,
      to: input.status,
      cancelledReason: input.cancelledReason ?? undefined,
      orderNumber: order.number,
    },
    ip: input.ip,
  });

  if (input.status === "REFUNDED" && appmaxEnabled()) {
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    if (payment?.gatewayOrderId) {
      requestAppmaxRefund(Number(payment.gatewayOrderId), cents(Number(order.total))).catch((err) => {
        console.error(`[appmax] Falha ao solicitar reembolso do pedido #${order.number}:`, err);
      });
    }
  }

  if (input.status === "SHIPPED") {
    await sendOrderStatusEmail(order.id, "shipped");
  }

  return updated;
}

type DeleteOrderInput = {
  orderId: string;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

export async function deleteOrder(input: DeleteOrderInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { select: { productId: true, variationId: true, quantity: true } } },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  const stockReserved = !TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus);

  const deleted = await prisma.$transaction(async (tx) => {
    if (stockReserved) {
      for (const item of order.items) {
        if (!item.productId) continue;
        if (item.variationId) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            type: "RELEASED",
            orderId: order.id,
            note: "Estoque liberado após exclusão do pedido",
          },
        });
      }
    }
    return tx.order.delete({ where: { id: order.id } });
  });

  await auditLog({
    userId: input.actor.id,
    action: "ORDER_DELETED",
    entityType: "Order",
    entityId: order.id,
    details: { orderNumber: order.number, stockRestored: stockReserved },
    ip: input.ip,
  });

  return deleted;
}

type FulfillOrderInput = {
  orderId: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  provider?: string;
  service?: string | null;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

export async function fulfillOrder(input: FulfillOrderInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error("Pedido não encontrado.");

  const shippable = ["PAID", "PROCESSING"] as OrderStatus[];
  if (!shippable.includes(order.status as OrderStatus)) {
    throw new Error(`Pedido "${order.status}" não pode ser enviado. Apenas Pago ou Em processamento.`);
  }

  const now = new Date();
  const trackingCode = input.trackingCode?.trim() || null;

  const saved = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "SHIPPED",
        shippedAt: now,
        trackingCode,
        trackingUrl: input.trackingUrl?.trim() || null,
      },
    });
    await tx.shipment.create({
      data: {
        orderId: order.id,
        provider: input.provider?.trim() || "CORREIOS",
        service: input.service?.trim() || order.shippingService || null,
        trackingCode,
        status: "CREATED",
        shippedAt: now,
      },
    });
    return updated;
  });

  await auditLog({
    userId: input.actor.id,
    action: "ORDER_FULFILLED",
    entityType: "Order",
    entityId: order.id,
    details: { orderNumber: order.number, trackingCode, provider: input.provider ?? null },
    ip: input.ip,
  });

  await sendOrderStatusEmail(order.id, "shipped");

  return saved;
}
