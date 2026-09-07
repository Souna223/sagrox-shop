import { NextRequest } from "next/server";
import { requireAdmin, ok, fail, handleError, getClientIp } from "@/lib/api";
import { serializeAdminOrder, refundOrder, rejectRefundRequest } from "@/lib/admin-orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string | null; action?: string };

    if (body.action === "reject") {
      const updated = await rejectRefundRequest({
        orderId: id,
        reason: body.reason,
        actor: { id: admin.id, name: admin.name },
        ip: getClientIp(request),
      });
      return ok(serializeAdminOrder(updated as never));
    }

    const updated = await refundOrder({
      orderId: id,
      reason: body.reason,
      actor: { id: admin.id, name: admin.name },
      ip: getClientIp(request),
    });

    return ok(serializeAdminOrder(updated as never));
  } catch (error) {
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return fail(error.message, 404);
    }
    if (error instanceof Error && (error.message.includes("reembolsado") || error.message.includes("pagos") || error.message.includes("confirmado") || error.message.includes("gateway") || error.message.includes("pendente"))) {
      return fail(error.message, 422);
    }
    return handleError(error);
  }
}