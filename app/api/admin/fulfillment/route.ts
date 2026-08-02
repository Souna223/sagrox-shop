import { NextRequest } from "next/server";
import { requireAdmin, ok, fail, handleError, getClientIp, parseJson } from "@/lib/api";
import { fulfillOrder } from "@/lib/admin-orders";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson<{
      orderId?: string;
      provider?: string;
      service?: string | null;
      trackingCode?: string | null;
      trackingUrl?: string | null;
    }>(request);

    if (!body.orderId) {
      return fail("Informe o pedido.");
    }
    if (!body.trackingCode?.trim()) {
      return fail("Informe o código de rastreio.");
    }

    const order = await fulfillOrder({
      orderId: body.orderId,
      provider: body.provider,
      service: body.service,
      trackingCode: body.trackingCode,
      trackingUrl: body.trackingUrl,
      actor: { id: admin.id, name: admin.name },
      ip: getClientIp(request),
    });

    return ok({ orderId: order.id, status: order.status });
  } catch (error) {
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return fail(error.message, 404);
    }
    if (error instanceof Error && error.message.includes("não pode ser enviado")) {
      return fail(error.message, 422);
    }
    return handleError(error);
  }
}
