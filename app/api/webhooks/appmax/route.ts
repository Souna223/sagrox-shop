import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/admin-orders";

type AppmaxWebhookBody = {
  event?: string;
  event_type?: string;
  data?: {
    id?: number | string;
    order_id?: number | string;
    customer_id?: number | string;
    status?: string;
    pix_code?: string;
    billet_url?: string;
    [key: string]: unknown;
  };
};

const PAYMENT_APPROVED_EVENTS = new Set([
  "OrderApproved",
  "OrderPaid",
  "OrderPaidByPix",
  "OrderUpSold",
  "order_approved",
  "order_paid",
  "order_paid_by_pix",
  "order_up_sold",
  "split_orders",
]);

const PAYMENT_AUTHORIZED_EVENTS = new Set([
  "OrderAuthorized",
  "order_authorized",
  "order_authorized_with_delay",
  "payment_authorized_with_delay",
]);

const ORDER_CANCELLED_EVENTS = new Set([
  "OrderPixExpired",
  "OrderBilletOverdue",
  "OrderChargeBackInTreatment",
  "order_pix_expired",
  "order_billet_overdue",
  "payment_not_authorized",
]);

const ORDER_REFUNDED_EVENTS = new Set(["OrderRefund", "order_refund"]);

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const body = JSON.parse(raw) as AppmaxWebhookBody;

    const event = body.event ?? "";
    const data = body.data ?? {};

    // Modelos de conteúdo: Standard usa data.id (com customer_id), flat usa data.order_id.
    const orderId = data.order_id ?? (data.customer_id !== undefined ? data.id : undefined);
    if (orderId === undefined) {
      return NextResponse.json({ ok: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: String(orderId) },
      include: { order: { select: { id: true, status: true, number: true } } },
    });

    if (!payment || !payment.order) {
      console.warn(`[appmax-webhook] Pedido AppMax ${orderId} não encontrado (event=${event})`);
      return NextResponse.json({ ok: true });
    }

    // Armazenar código Pix / boleto quando o gateway notifica a criação.
    if (data.pix_code) {
      await prisma.payment.update({ where: { id: payment.id }, data: { pixCode: String(data.pix_code) } });
    }
    if (data.billet_url) {
      await prisma.payment.update({ where: { id: payment.id }, data: { boletoUrl: String(data.billet_url) } });
    }

    if (PAYMENT_APPROVED_EVENTS.has(event)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "APPROVED", paidAt: new Date() },
      });
      if (payment.order.status === "AWAITING_PAYMENT" || payment.order.status === "PENDING") {
        await updateOrderStatus({
          orderId: payment.order.id,
          status: "PAID",
          actor: { id: "appmax", name: "AppMax" },
        }).catch((err) => {
          console.error(`[appmax-webhook] Falha ao aprovar pedido ${payment.order.number}:`, err);
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (PAYMENT_AUTHORIZED_EVENTS.has(event)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING" } });
      return NextResponse.json({ ok: true });
    }

    if (ORDER_REFUNDED_EVENTS.has(event)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
      if (payment.order.status !== "REFUNDED" && payment.order.status !== "CANCELLED") {
        await updateOrderStatus({
          orderId: payment.order.id,
          status: "REFUNDED",
          actor: { id: "appmax", name: "AppMax" },
        }).catch((err) => {
          console.error(`[appmax-webhook] Falha ao reembolsar pedido ${payment.order.number}:`, err);
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (ORDER_CANCELLED_EVENTS.has(event)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      if (
        payment.order.status !== "CANCELLED" &&
        payment.order.status !== "REFUNDED" &&
        payment.order.status !== "COMPLETED"
      ) {
        await updateOrderStatus({
          orderId: payment.order.id,
          status: "CANCELLED",
          cancelledReason: `Pagamento não confirmado (${event})`,
          actor: { id: "appmax", name: "AppMax" },
        }).catch((err) => {
          console.error(`[appmax-webhook] Falha ao cancelar pedido ${payment.order.number}:`, err);
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[appmax-webhook] Erro ao processar webhook:", error);
    return NextResponse.json({ ok: false });
  }
}
