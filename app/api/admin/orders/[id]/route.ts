import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError, getClientIp } from "@/lib/api";
import { serializeAdminOrder, updateOrderStatus } from "@/lib/admin-orders";
import type { OrderStatus } from "@/generated/prisma/enums";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    void admin;
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isBlocked: true, role: true },
        },
        items: {
          orderBy: { id: "asc" },
          include: {
            product: { select: { id: true, slug: true } },
            variation: { select: { id: true, name: true } },
          },
        },
        payments: { orderBy: { createdAt: "asc" } },
        refunds: { orderBy: { createdAt: "asc" } },
        shipments: { orderBy: { createdAt: "asc" } },
        couponUsages: { include: { coupon: { select: { code: true } } } },
        loyaltyTransactions: true,
      },
    });

    if (!order) return fail("Pedido não encontrado.", 404);

    return ok(serializeAdminOrder(order as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      cancelledReason?: string | null;
      trackingCode?: string | null;
      trackingUrl?: string | null;
    };

    if (!body.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
      return fail("Status inválido.");
    }

    const updated = await updateOrderStatus({
      orderId: id,
      status: body.status as OrderStatus,
      cancelledReason: body.cancelledReason,
      trackingCode: body.trackingCode,
      trackingUrl: body.trackingUrl,
      actor: { id: admin.id, name: admin.name },
      ip: getClientIp(request),
    });

    return ok(serializeAdminOrder(updated as never));
  } catch (error) {
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return fail(error.message, 404);
    }
    if (error instanceof Error && error.message.includes("Não é possível")) {
      return fail(error.message, 422);
    }
    return handleError(error);
  }
}

export function DELETE() {
  return fail("Operação não suportada.", 405);
}
