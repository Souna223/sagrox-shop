import { NextRequest } from "next/server";
import { requireAuth, ok, fail, handleError, getClientIp } from "@/lib/api";
import { requestRefund } from "@/lib/admin-orders";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  try {
    const user = await requireAuth();
    const { number } = await params;
    const orderNumber = Number(number);
    if (Number.isNaN(orderNumber) || orderNumber <= 0) {
      return fail("Número de pedido inválido.", 422);
    }

    const order = await prisma.order.findFirst({
      where: { number: orderNumber, userId: user.id },
      select: { id: true, number: true },
    });
    if (!order) {
      return fail("Pedido não encontrado.", 404);
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: string | null };
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;

    await requestRefund({
      orderId: order.id,
      reason,
      actor: { id: user.id, name: user.name },
      ip: getClientIp(request),
    });

    return ok({ message: "Solicitação de reembolso enviada. Ela será analisada pela nossa equipe." });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) return fail(error.message, 404);
      if (
        error.message.includes("reembolsado") ||
        error.message.includes("em análise") ||
        error.message.includes("pagos") ||
        error.message.includes("indisponível") ||
        error.message.includes("já enviada")
      ) {
        return fail(error.message, 422);
      }
    }
    return handleError(error);
  }
}