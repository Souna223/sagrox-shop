import { checkoutSchema } from "@/lib/validators";
import { ok, fail, handleError, parseJson, rateLimit, getClientIp, getSessionUser } from "@/lib/api";
import { createOrder } from "@/lib/checkout";
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
