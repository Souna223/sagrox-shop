import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_STATUS, PAYMENT_METHOD, ORDER_STATUS } from "@/lib/constants";
import type { PaymentStatus, PaymentMethod, OrderStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const number = Number(request.nextUrl.searchParams.get("number"));
  if (!number || number <= 0) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { number },
    select: {
      status: true,
      payments: {
        select: {
          status: true,
          method: true,
          pixQrCode: true,
          pixCode: true,
          boletoUrl: true,
          boletoBarcode: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const payment = order.payments[0];

  return Response.json({
    orderStatus: order.status,
    orderStatusLabel: ORDER_STATUS[order.status as OrderStatus],
    paymentStatus: payment?.status ?? "PENDING",
    paymentStatusLabel: PAYMENT_STATUS[payment?.status as PaymentStatus] ?? PAYMENT_STATUS.PENDING,
    paymentMethod: payment?.method ?? null,
    paymentMethodLabel: payment?.method
      ? (PAYMENT_METHOD[payment.method as PaymentMethod] ?? payment.method)
      : null,
    pixQrCode: payment?.pixQrCode ?? null,
    pixCode: payment?.pixCode ?? null,
    boletoUrl: payment?.boletoUrl ?? null,
    boletoBarcode: payment?.boletoBarcode ?? null,
  });
}
