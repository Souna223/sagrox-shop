import { checkoutSchema } from "@/lib/validators";
import { ok, fail, handleError, parseJson, rateLimit, getClientIp, getSessionUser } from "@/lib/api";
import { createOrder } from "@/lib/checkout";
import { processOrderPayment, cancelOrderOnPaymentFailure } from "@/lib/appmax-checkout";
import { appmaxEnabled, appmaxReady } from "@/lib/appmax";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(request: Request) {
  if (!rateLimit(`checkout:${getClientIp(request)}`, 10, 300)) {
    return fail("Muitas tentativas. Tente novamente em instantes.", 429);
  }

  try {
    const body = await parseJson(request);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

    const data = parsed.data;
    const user = await getSessionUser();

    const shippingAddress = data.shippingAddress as unknown as Prisma.InputJsonValue;
    const billingAddress = (data.billingAddress ?? data.shippingAddress) as unknown as Prisma.InputJsonValue;

    const order = await createOrder({
      email: data.email,
      customerName: data.customerName,
      customerCpf: data.cpf,
      phone: data.phone,
      userId: user?.id ?? null,
      items: data.items,
      shippingAddress,
      billingAddress,
      shippingService: data.shippingService,
      couponCode: data.couponCode,
      paymentMethod: data.paymentMethod,
      installments: data.installments,
      sessionId: data.sessionId,
      ip: getClientIp(request),
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmTerm: data.utmTerm,
      utmContent: data.utmContent,
    });

    if (appmaxEnabled() && !(await appmaxReady())) {
      await cancelOrderOnPaymentFailure(
        order.orderId,
        "Gateway de pagamento ainda não configurado. Tente novamente mais tarde.",
        getClientIp(request),
      );
      return fail("O checkout está indisponível no momento. Tente novamente em instantes.", 503);
    }

    if (appmaxEnabled()) {
      const cpf = (data.cpf ?? "").replace(/\D/g, "");
      if (cpf.length !== 11) {
        await cancelOrderOnPaymentFailure(order.orderId, "CPF inválido ou não informado.", getClientIp(request));
        return fail("Informe um CPF válido para realizar o pagamento.", 422);
      }

      try {
        await processOrderPayment({
          orderId: order.orderId,
          paymentMethod: data.paymentMethod,
          installments: data.installments,
          cpf,
          phone: data.phone ?? null,
          ip: getClientIp(request),
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          utmTerm: data.utmTerm,
          utmContent: data.utmContent,
          card: data.card,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao processar o pagamento.";
        await cancelOrderOnPaymentFailure(order.orderId, message, getClientIp(request));
        return fail(message, 502);
      }
    }

    if (user) {
      const addressCount = await prisma.address.count({ where: { userId: user.id } });
      const address = data.shippingAddress;
      await prisma.address.create({
        data: {
          userId: user.id,
          label: "Entrega",
          zip: address.zip,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          isDefault: addressCount === 0,
        },
      });

      if (data.phone) {
        await prisma.user.update({ where: { id: user.id }, data: { phone: data.phone } });
      }
    }

    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}
