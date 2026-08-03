import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, SITE_URL, ORDER_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { formatBRL } from "@/lib/format";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const from = `${SITE_NAME} <${process.env.SMTP_FROM ?? "nao-responder@wbsite.com.br"}>`;
  const tx = getTransporter();

  if (!tx) {
    console.log(`[mail:dev] De: ${from} | Para: ${message.to} | Assunto: ${message.subject}`);
    console.log(`[mail:dev] HTML: ${message.html.slice(0, 500)}`);
    return false;
  }

  try {
    await tx.sendMail({ from, to: message.to, subject: message.subject, html: message.html });
    return true;
  } catch (error) {
    console.error(`[mail] Falha ao enviar e-mail para ${message.to}:`, error);
    return false;
  }
}

export function buildResetPasswordUrl(token: string): string {
  return `${SITE_URL}/recuperar-senha/confirmar?token=${token}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OrderEmailKind = "created" | "paid" | "shipped" | "cancelled" | "refunded";

export async function sendOrderStatusEmail(orderId: string, kind: OrderEmailKind): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        email: true,
        customerName: true,
        total: true,
        status: true,
        paymentMethod: true,
        trackingCode: true,
        trackingUrl: true,
        items: { select: { name: true, sku: true, quantity: true, unitPrice: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) return false;

    const payment = order.payments[0];
    const methodLabel = order.paymentMethod
      ? PAYMENT_METHOD[order.paymentMethod] ?? String(order.paymentMethod)
      : "Pagamento";

    const itemsRows = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)} (${escapeHtml(item.sku)})</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatBRL(Number(item.unitPrice) * item.quantity)}</td>
          </tr>`,
      )
      .join("");

    const messages: Record<OrderEmailKind, { subject: string; intro: string; body: string }> = {
      created: {
        subject: `Pedido #${order.number} confirmado — ${SITE_NAME}`,
        intro: `Olá, ${order.customerName}!`,
        body:
          payment?.method === "PIX"
            ? "Recebemos seu pedido. Finalize o pagamento via Pix para confirmar a compra."
            : "Recebemos seu pedido e estamos aguardando a confirmação do pagamento.",
      },
      paid: {
        subject: `Pagamento aprovado — Pedido #${order.number}`,
        intro: `Olá, ${order.customerName}!`,
        body: "O pagamento do seu pedido foi aprovado. Já estamos preparando a sua entrega.",
      },
      shipped: {
        subject: `Pedido #${order.number} enviado — ${SITE_NAME}`,
        intro: `Olá, ${order.customerName}!`,
        body: "Seu pedido foi enviado. Acompanhe o rastreamento abaixo.",
      },
      cancelled: {
        subject: `Pagamento não confirmado — Pedido #${order.number}`,
        intro: `Olá, ${order.customerName}!`,
        body: "Não recebemos a confirmação do pagamento do seu pedido, então ele foi cancelado. Se ainda quiser, você pode fazer um novo pedido na loja.",
      },
      refunded: {
        subject: `Reembolso — Pedido #${order.number}`,
        intro: `Olá, ${order.customerName}!`,
        body: "O valor do seu pedido foi reembolsado. O prazo para o valor cair na conta depende da instituição financeira.",
      },
    };

    const msg = messages[kind];

    const trackingBlock = order.trackingCode
      ? `
        <p style="margin-top:16px;padding:12px;border:1px solid #eee;border-radius:6px;background:#fafafa">
          <strong>Código de rastreio:</strong> ${escapeHtml(order.trackingCode)}<br />
          ${
            order.trackingUrl
              ? `<a href="${order.trackingUrl}">Rastrear pela transportadora</a>`
              : "Você pode acompanhar o pedido pela página da transportadora."
          }
        </p>`
      : "";

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin:0 0 16px">${SITE_NAME}</h2>
        <p>${escapeHtml(msg.intro)}</p>
        <p>${escapeHtml(msg.body)}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #eee">Produto</th>
            <th style="padding:8px;border-bottom:2px solid #eee">Qtd</th>
            <th style="padding:8px;border-bottom:2px solid #eee;text-align:right">Total</th>
          </tr>
          ${itemsRows}
          <tr>
            <td colspan="2" style="padding:8px;text-align:right;font-weight:bold">Total</td>
            <td style="padding:8px;text-align:right;font-weight:bold">${formatBRL(Number(order.total))}</td>
          </tr>
        </table>
        <p style="color:#666;font-size:13px">Método de pagamento: ${methodLabel} · Status: ${ORDER_STATUS[order.status]}</p>
        ${trackingBlock}
        <p>
          <a href="${SITE_URL}/conta/pedidos/${order.number}" style="background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block">
            Acompanhar pedido
          </a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:24px">Você recebeu este e-mail por ter feito uma compra em ${SITE_NAME}.</p>
      </div>`;

    return sendEmail({ to: order.email, subject: msg.subject, html });
  } catch (error) {
    console.error(`[mail] Falha ao montar e-mail do pedido ${orderId} (${kind}):`, error);
    return false;
  }
}
