import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/admin-orders";
import {
  createAppmaxCustomer,
  createAppmaxOrder,
  processAppmaxPayment,
  getAppmaxOrder,
  cents,
  appmaxEnabled,
} from "@/lib/appmax";
import type { AppmaxProduct } from "@/lib/appmax";

export type AppmaxCheckoutInput = {
  orderId: string;
  paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  installments?: number | null;
  cpf: string;
  phone?: string | null;
  ip?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  card?: {
    number: string;
    cvv: string;
    expirationMonth: string;
    expirationYear: string;
    holderName: string;
  } | null;
};

export async function processOrderPayment(input: AppmaxCheckoutInput): Promise<void> {
  if (!appmaxEnabled()) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      number: true,
      customerName: true,
      email: true,
      total: true,
      subtotal: true,
      discount: true,
      shippingFee: true,
      shippingAddress: true,
      items: {
        select: { sku: true, name: true, quantity: true, unitPrice: true },
      },
    },
  });

  if (!order) throw new Error("Pedido não encontrado.");

  const addressRaw = (order.shippingAddress ?? {}) as {
    zip?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  const [firstName, ...lastNameParts] = order.customerName.trim().split(/\s+/);
  const lastName = lastNameParts.join(" ") || "-";

  const products: AppmaxProduct[] = order.items.map((item) => ({
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unit_value: cents(Number(item.unitPrice)),
    type: "physical",
  }));

  const customer = await createAppmaxCustomer({
    firstName,
    lastName,
    email: order.email,
    phone: input.phone ?? null,
    documentNumber: input.cpf,
    ip: input.ip,
    address: {
      postcode: addressRaw.zip ?? "",
      street: addressRaw.street ?? "",
      number: addressRaw.number ?? "",
      complement: addressRaw.complement ?? undefined,
      district: addressRaw.neighborhood ?? undefined,
      city: addressRaw.city ?? "",
      state: addressRaw.state ?? "",
    },
    products,
    tracking: {
      utm_source: input.utmSource ?? undefined,
      utm_medium: input.utmMedium ?? undefined,
      utm_campaign: input.utmCampaign ?? undefined,
      utm_term: input.utmTerm ?? undefined,
      utm_content: input.utmContent ?? undefined,
    },
  });

  const appmaxOrder = await createAppmaxOrder({
    customerId: customer.customerId,
    productsValueCents: cents(Number(order.subtotal)),
    discountValueCents: cents(Number(order.discount)),
    shippingValueCents: cents(Number(order.shippingFee)),
    products,
  });

  const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
  if (!payment) throw new Error("Pagamento do pedido não encontrado.");

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayOrderId: String(appmaxOrder.orderId), status: "PROCESSING" },
  });

  const result = await processAppmaxPayment({
    orderId: appmaxOrder.orderId,
    customerId: customer.customerId,
    method: input.paymentMethod,
    documentNumber: input.cpf,
    card: input.card
      ? {
          number: input.card.number,
          cvv: input.card.cvv,
          expirationMonth: input.card.expirationMonth,
          expirationYear: input.card.expirationYear,
          holderName: input.card.holderName,
          installments: input.installments ?? 1,
          softDescriptor: (process.env.NEXT_PUBLIC_SITE_NAME ?? "sagrox").slice(0, 13),
        }
      : undefined,
  });

  if (result.method === "PIX") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { pixQrCode: result.pixQrcode || null, pixCode: result.pixEmv || null, status: "PENDING" },
    });
    return;
  }

  if (result.method === "BOLETO") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { boletoUrl: result.boletoLinkPdf || null, boletoBarcode: result.boletoDigitableLine || null, status: "PENDING" },
    });
    return;
  }

  // Cartão de crédito
  if (!result.payReference) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new Error("Pagamento não autorizado pela operadora.");
  }

  const appmaxDetails = await getAppmaxOrder(appmaxOrder.orderId).catch(() => null);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayTransactionId: result.payReference || null,
      cardBrand: appmaxDetails?.payment?.card?.brand ?? null,
      cardLast4: appmaxDetails?.payment?.card?.number?.replace(/\D/g, "").slice(-4) ?? null,
      status: result.status === "aprovado" ? "APPROVED" : result.status === "autorizado" ? "PROCESSING" : "PENDING",
    },
  });

  if (result.status === "aprovado") {
    await updateOrderStatus({
      orderId: order.id,
      status: "PAID",
      actor: { id: "appmax", name: "AppMax" },
      ip: input.ip,
    });
  } else if (result.status === "autorizado") {
    // Anti-fraude em análise; aguardar webhook
    return;
  } else {
    throw new Error(`Pagamento não aprovado (status: ${result.status}).`);
  }
}

export async function cancelOrderOnPaymentFailure(orderId: string, reason: string, ip?: string | null): Promise<void> {
  const payment = await prisma.payment.findFirst({ where: { orderId } });
  if (payment) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
  await updateOrderStatus({
    orderId,
    status: "CANCELLED",
    cancelledReason: reason,
    actor: { id: "appmax", name: "AppMax" },
    ip,
  }).catch(() => {
    // se a transição não for permitida, mantém o pedido para tratamento manual
    console.error(`[appmax] Não foi possível cancelar o pedido ${orderId}: ${reason}`);
  });
}
