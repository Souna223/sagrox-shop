import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/generated/prisma/enums";

const schema = z.object({
  number: z.coerce.number().int().positive("Número de pedido inválido."),
  email: z.string().email("E-mail inválido.").max(254),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`track:${ip}`, 10, 300)) {
      return fail("Muitas consultas. Aguarde alguns minutos.", 429);
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

    const { number, email } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { number },
      select: {
        number: true,
        email: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        trackingCode: true,
        trackingUrl: true,
        total: true,
        shippingService: true,
        shippingEstimateDays: true,
        createdAt: true,
        shippedAt: true,
        items: { select: { name: true, sku: true, imageUrl: true, quantity: true, unitPrice: true } },
      },
    });

    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      return fail("Pedido não encontrado. Confira o número e o e-mail informados.", 404);
    }

    return ok({
      number: order.number,
      status: order.status,
      statusLabel: ORDER_STATUS[order.status as OrderStatus],
      paymentStatus: order.paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS[order.paymentStatus as PaymentStatus],
      paymentMethod: order.paymentMethod,
      paymentMethodLabel: order.paymentMethod
        ? (PAYMENT_METHOD[order.paymentMethod as PaymentMethod] ?? String(order.paymentMethod))
        : null,
      trackingCode: order.trackingCode,
      trackingUrl: order.trackingUrl,
      shippingService: order.shippingService,
      shippingEstimateDays: order.shippingEstimateDays,
      createdAt: order.createdAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() ?? null,
      total: order.total.toString(),
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    });
  } catch (error) {
    console.error("[track]", error);
    return fail("Erro ao consultar o pedido. Tente novamente.", 500);
  }
}
