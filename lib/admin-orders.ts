import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { serializeRecord } from "@/lib/serialize";
import { ORDER_STATUS_TRANSITIONS, TERMINAL_ORDER_STATUSES } from "@/lib/constants";
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

  return updated;
}
