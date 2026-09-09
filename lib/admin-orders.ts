import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { serializeRecord } from "@/lib/serialize";
import { ORDER_STATUS_TRANSITIONS, TERMINAL_ORDER_STATUSES } from "@/lib/constants";
import { requestAppmaxRefund, appmaxEnabled, cents } from "@/lib/appmax";
import { sendOrderStatusEmail } from "@/lib/mail";
import { fireAdEvent, newAdEventId } from "@/lib/ads";
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
  skipGatewayRefund?: boolean;
};

type StockLine = {
  productId: string;
  variationId: string | null;
  quantity: number;
};

type StockLineItem = {
  productId: string | null;
  variationId: string | null;
  kitId: string | null;
  quantity: number;
  components?: unknown;
};

function expandStockLines(items: StockLineItem[]): StockLine[] {
  const lines: StockLine[] = [];
  for (const item of items) {
    if (item.kitId && Array.isArray(item.components)) {
      for (const c of item.components as { productId?: string; variationId?: string | null; quantity?: number }[]) {
        if (!c?.productId || !c.quantity) continue;
        lines.push({
          productId: c.productId,
          variationId: c.variationId ?? null,
          quantity: c.quantity * item.quantity,
        });
      }
      continue;
    }
    if (!item.productId) continue;
    lines.push({ productId: item.productId, variationId: item.variationId ?? null, quantity: item.quantity });
  }
  return lines;
}

export async function updateOrderStatus(input: StatusUpdateInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        select: { productId: true, variationId: true, kitId: true, quantity: true, components: true },
      },
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
  if (input.status === "PAID") data.paymentStatus = "APPROVED";
  if (input.status === "SHIPPED" && !order.shippedAt) data.shippedAt = now;
  if (input.status === "DELIVERED" && !order.deliveredAt) data.deliveredAt = now;
  if (input.status === "CANCELLED") {
    data.cancelledAt = now;
    data.cancelledReason = input.cancelledReason?.trim() || null;
  }
  if (input.status === "REFUNDED") data.paymentStatus = "REFUNDED";
  if (input.status === "CANCELLED") data.paymentStatus = "CANCELLED";
  if (input.trackingCode !== undefined) data.trackingCode = input.trackingCode?.trim() || null;
  if (input.trackingUrl !== undefined) data.trackingUrl = input.trackingUrl?.trim() || null;

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.order.update({
      where: { id: order.id },
      data: data as never,
    });

    if (wasActive && becomingTerminal) {
      for (const item of expandStockLines(order.items)) {
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

  if (input.status === "PAID" && order.status !== "PAID") {
    fireAdEvent("purchase", {
      eventId: newAdEventId(`purchase_${order.number}`),
      value: Number(order.total),
      currency: "BRL",
      contentIds: order.items
        .map((i) => i.productId ?? i.kitId)
        .filter((id): id is string => !!id),
      contents: order.items.map((i) => ({
        id: i.productId ?? i.kitId ?? "",
        quantity: i.quantity,
      })),
      user: {
        email: order.email,
        ip: input.ip,
      },
    });
  }

  if (input.status === "REFUNDED" && appmaxEnabled() && !input.skipGatewayRefund) {
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
    include: {
      items: {
        select: { productId: true, variationId: true, kitId: true, quantity: true, components: true },
      },
    },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  const stockReserved = !TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus);

  const deleted = await prisma.$transaction(async (tx) => {
    if (stockReserved) {
      for (const item of expandStockLines(order.items)) {
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

export type RefundOrderInput = {
  orderId: string;
  reason?: string | null;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

const REFUNDABLE_STATUSES = new Set(["PAID", "PROCESSING", "DELIVERED", "COMPLETED", "REFUND_REQUESTED"]);

function statusIsRefundable(status: string): boolean {
  return REFUNDABLE_STATUSES.has(status);
}

export async function refundOrder(input: RefundOrderInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        select: { productId: true, variationId: true, kitId: true, quantity: true, components: true },
      },
    },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  if (TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus)) {
    throw new Error(
      order.status === "REFUNDED" ? "Pedido já reembolsado." : "Pedido cancelado não pode ser reembolsado.",
    );
  }
  if (!statusIsRefundable(order.status)) {
    throw new Error("Apenas pedidos pagos podem ser reembolsados.");
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
  });

  if (!payment || payment.status !== "APPROVED") {
    throw new Error("Pagamento não confirmado — reembolso indisponível.");
  }

  if (appmaxEnabled() && payment.gatewayOrderId) {
    try {
      await requestAppmaxRefund(Number(payment.gatewayOrderId), cents(Number(order.total)));
    } catch (err) {
      console.error(`[appmax] Falha ao solicitar reembolso do pedido #${order.number}:`, err);
      throw new Error("Falha ao solicitar reembolso junto ao gateway de pagamento.");
    }
  }

  const updated = await updateOrderStatus({
    orderId: order.id,
    status: "REFUNDED",
    cancelledReason: input.reason,
    actor: input.actor,
    ip: input.ip,
    skipGatewayRefund: true,
  });

  await upsertRefundRecord(payment.id, order.id, order.total, input.reason);

  if (order.status === "REFUND_REQUESTED") {
    await sendOrderStatusEmail(order.id, "refund-accepted");
  }
  await sendOrderStatusEmail(order.id, "refunded");

  return updated;
}

async function upsertRefundRecord(paymentId: string, orderId: string, amount: unknown, reason?: string | null) {
  const existing = await prisma.refund.findFirst({
    where: { orderId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.refund.update({
      where: { id: existing.id },
      data: { status: "COMPLETED", gatewayRefundId: existing.gatewayRefundId },
    });
    return;
  }
  await prisma.refund.create({
    data: {
      paymentId,
      orderId,
      amount: amount as never,
      reason: reason?.trim() || null,
      status: "COMPLETED",
    },
  });
}

export type RequestRefundInput = {
  orderId: string;
  reason?: string | null;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

export async function requestRefund(input: RequestRefundInput) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        select: { productId: true, variationId: true, kitId: true, quantity: true, components: true },
      },
    },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  if (TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus)) {
    throw new Error(
      order.status === "REFUNDED" ? "Pedido já reembolsado." : "Pedido cancelado não pode ser reembolsado.",
    );
  }
  if (order.status === "REFUND_REQUESTED") {
    throw new Error("Já existe uma solicitação de reembolso em análise.");
  }
  if (order.status !== "PAID" && order.status !== "PROCESSING") {
    throw new Error("Apenas pedidos pagos podem solicitar reembolso.");
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
  });

  if (!payment || payment.status !== "APPROVED") {
    throw new Error("Pagamento não confirmado — reembolso indisponível.");
  }

  const existing = await prisma.refund.findFirst({
    where: { orderId: order.id, status: "PENDING" },
  });
  if (existing) {
    throw new Error("Solicitação de reembolso já enviada.");
  }

  const updated = await updateOrderStatus({
    orderId: order.id,
    status: "REFUND_REQUESTED",
    cancelledReason: input.reason,
    actor: input.actor,
    ip: input.ip,
  });

  await prisma.refund.create({
    data: {
      paymentId: payment.id,
      orderId: order.id,
      amount: order.total,
      reason: input.reason?.trim() || null,
      status: "PENDING",
    },
  });

  return updated;
}

export type RejectRefundInput = {
  orderId: string;
  reason?: string | null;
  actor: { id: string; name?: string | null };
  ip?: string | null;
};

export async function rejectRefundRequest(input: RejectRefundInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status !== "REFUND_REQUESTED") {
    throw new Error("Não há solicitação de reembolso pendente.");
  }

  const pending = await prisma.refund.findFirst({
    where: { orderId: order.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) throw new Error("Nenhuma solicitação de reembolso pendente encontrada.");

  const updated = await updateOrderStatus({
    orderId: order.id,
    status: "PAID",
    cancelledReason: input.reason,
    actor: input.actor,
    ip: input.ip,
  });

  await prisma.refund.update({
    where: { id: pending.id },
    data: { status: "REJECTED", reason: input.reason?.trim() || pending.reason },
  });

  await sendOrderStatusEmail(order.id, "refund-rejected");

  return updated;
}
