import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppmaxOrder } from "@/lib/appmax";
import { updateOrderStatus } from "@/lib/admin-orders";
import { sendOrderStatusEmail } from "@/lib/mail";
import { PAYMENT_STATUS, PAYMENT_METHOD, ORDER_STATUS } from "@/lib/constants";
import type { PaymentStatus, PaymentMethod, OrderStatus } from "@/generated/prisma/enums";

const APPROVED_STATUSES = new Set(["aprovado", "approved"]);

export async function GET(request: NextRequest) {
  const number = Number(request.nextUrl.searchParams.get("number"));
  if (!number || number <= 0) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { number },
    select: {
      id: true,
      status: true,
      payments: {
        select: {
          id: true,
          status: true,
          method: true,
          gatewayOrderId: true,
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

  let payment = order.payments[0];

  if (payment && payment.status === "PENDING" && payment.gatewayOrderId) {
    try {
      const appmaxOrder = await getAppmaxOrder(Number(payment.gatewayOrderId));
      if (APPROVED_STATUSES.has(appmaxOrder.status?.toLowerCase())) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "APPROVED", paidAt: new Date() },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "APPROVED", paidAt: new Date() },
        });
        if (order.status === "AWAITING_PAYMENT" || order.status === "PENDING") {
          await updateOrderStatus({
            orderId: order.id,
            status: "PAID",
            actor: { id: "appmax", name: "AppMax" },
          }).catch(() => {});
        }
        await sendOrderStatusEmail(order.id, "paid");
        payment = { ...payment, status: "APPROVED" };
      }
    } catch {
      // Appmax API unreachable — continue with DB status
    }
  }

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
