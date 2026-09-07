import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { requestRefund } from "@/lib/admin-orders";

const schema = z.object({
  number: z.coerce.number().int().positive("Número de pedido inválido."),
  email: z.string().email("E-mail inválido.").max(254),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`track-refund:${ip}`, 5, 600)) {
      return fail("Muitas solicitações. Aguarde alguns minutos.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Dados inválidos.", 422);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const { number, email, reason } = parsed.data;

    const order = await prisma.order.findUnique({ where: { number }, select: { id: true, email: true } });
    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      return fail("Pedido não encontrado. Confira o número e o e-mail informados.", 404);
    }

    await requestRefund({
      orderId: order.id,
      reason,
      actor: { id: "track", name: email },
      ip,
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
    console.error("[track-refund]", error);
    return fail("Erro ao solicitar reembolso. Tente novamente.", 500);
  }
}