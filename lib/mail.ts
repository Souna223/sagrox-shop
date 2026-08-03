import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, SITE_URL, PAYMENT_METHOD } from "@/lib/constants";
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

const BRAND = "#c81e2e";
const INK = "#18181b";
const MUTED = "#71717a";
const BORDER = "#ececee";
const BACKGROUND = "#f4f4f5";

type EmailLayoutOptions = {
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string } | null;
};

function renderEmailLayout({ title, bodyHtml, cta }: EmailLayoutOptions): string {
  const logoUrl = `${SITE_URL}/logo.png`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BACKGROUND};padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDER}">
            <tr>
              <td align="center" style="padding:28px 24px;background:#ffffff">
                <a href="${SITE_URL}" style="text-decoration:none">
                  <img src="${logoUrl}" alt="${SITE_NAME}" width="150" height="auto" style="width:auto;max-height:64px;display:block;margin:0 auto" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:${BRAND};font-size:0;line-height:0">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:${INK}">
                <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${INK}">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.65;color:#3f3f46">${bodyHtml}</div>
                ${
                  cta
                    ? `<p style="margin:26px 0 6px">
                        <a href="${cta.href}" style="background:${BRAND};color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">${escapeHtml(cta.label)}</a>
                      </p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background:#fafafa;border-top:1px solid ${BORDER};text-align:center">
                <p style="margin:0 0 8px;font-size:12px;color:${MUTED}">${SITE_NAME} — compras seguras · entrega em todo o Brasil</p>
                <p style="margin:0;font-size:12px;color:#a1a1aa">
                  <a href="${SITE_URL}" style="color:${MUTED};text-decoration:none">Loja</a> · 
                  <a href="${SITE_URL}/conta/pedidos" style="color:${MUTED};text-decoration:none">Meus pedidos</a> · 
                  <a href="${SITE_URL}/contato" style="color:${MUTED};text-decoration:none">Contato</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function renderOrderSummary(order: {
  number: number;
  total: string;
  items: { name: string; sku: string; quantity: number; unitPrice: string }[];
}): string {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:#3f3f46">
            ${escapeHtml(item.name)}
            <div style="color:${MUTED};font-size:12px;margin-top:2px">Qtd: ${item.quantity} · ${formatBRL(Number(item.unitPrice))}</div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;text-align:right;white-space:nowrap">
            ${formatBRL(Number(item.unitPrice) * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid ${BORDER};border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#fafafa;padding:10px 12px;font-size:13px;font-weight:bold;color:${INK}">Produto</td>
        <td style="background:#fafafa;padding:10px 12px;font-size:13px;font-weight:bold;text-align:right;color:${INK}">Total</td>
      </tr>
      ${rows}
      <tr>
        <td style="padding:12px;font-size:14px;font-weight:bold;color:${INK}">Total do pedido</td>
        <td style="padding:12px;font-size:15px;font-weight:bold;text-align:right;color:${BRAND}">${formatBRL(Number(order.total))}</td>
      </tr>
    </table>`;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const html = renderEmailLayout({
    title: "Redefinição de senha",
    bodyHtml: `
      <p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}! Recebemos um pedido para redefinir a senha da sua conta em <strong>${SITE_NAME}</strong>.</p>
      <p style="margin:0 0 12px">Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
      <p style="margin:0;font-size:13px;color:${MUTED}">Se você não pediu a redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>`,
    cta: { label: "Redefinir senha", href: input.resetUrl },
  });

  return sendEmail({ to: input.to, subject: `Redefinição de senha — ${SITE_NAME}`, html });
}

export async function sendWelcomeEmail(input: { to: string; name: string }): Promise<boolean> {
  const html = renderEmailLayout({
    title: `Bem-vindo à ${SITE_NAME}!`,
    bodyHtml: `
      <p style="margin:0 0 14px">Olá, ${escapeHtml(input.name)}! Sua conta em <strong>${SITE_NAME}</strong> foi criada com sucesso. Que bom ter você por aqui!</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BORDER};border-radius:8px;overflow:hidden">
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid ${BORDER};font-size:13px;color:#3f3f46"><strong style="color:${BRAND}">Pedidos:</strong> acompanhe suas compras e entregas em tempo real</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid ${BORDER};font-size:13px;color:#3f3f46"><strong style="color:${BRAND}">Praticidade:</strong> checkout mais rápido com seus dados e endereços salvos</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#3f3f46"><strong style="color:${BRAND}">Vantagens:</strong> receba novidades, cupons e ofertas em primeira mão</td>
        </tr>
      </table>
      <p style="margin:0 0 8px">Já está tudo pronto. Vamos às compras?</p>`,
    cta: { label: "Explorar a loja", href: SITE_URL },
  });

  return sendEmail({ to: input.to, subject: `Bem-vindo(a) à ${SITE_NAME}!`, html });
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
    const orderUrl = `${SITE_URL}/conta/pedidos/${order.number}`;
    const summary = renderOrderSummary(order as never);

    const bodyByKind: Record<
      OrderEmailKind,
      { title: string; subject: string; bodyHtml: string; cta: { label: string; href: string } }
    > = {
      created: {
        title: "Pedido confirmado",
        subject: `Pedido #${order.number} confirmado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 12px">Olá, ${escapeHtml(order.customerName)}! Recebemos o seu pedido <strong>#${order.number}</strong> e já estamos cuidando dele.</p>
          ${summary}
          ${
            payment?.method === "PIX"
              ? `<p style="margin:12px 0 0">Pagamento via <strong>Pix</strong> pendente. Finalize o pagamento na página do pedido para confirmar a compra.</p>`
              : `<p style="margin:12px 0 0">Pagamento via <strong>${escapeHtml(methodLabel)}</strong>. Assim que a operadora confirmar, avisamos você por aqui.</p>`
          }`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      paid: {
        title: "Pagamento aprovado",
        subject: `Pagamento aprovado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 12px">Olá, ${escapeHtml(order.customerName)}! O pagamento do seu pedido <strong>#${order.number}</strong> foi aprovado. Muito obrigado pela compra!</p>
          ${summary}
          <p style="margin:12px 0 0">Já estamos preparando a sua entrega. Assim que o pedido for enviado, você receberá o código de rastreio por aqui.</p>`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      shipped: {
        title: "Seu pedido foi enviado",
        subject: `Pedido #${order.number} enviado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 12px">Olá, ${escapeHtml(order.customerName)}! Seu pedido <strong>#${order.number}</strong> foi enviado. Hora de acompanhar a entrega!</p>
          ${summary}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px dashed ${BORDER};border-radius:8px">
            <tr>
              <td style="padding:14px;font-size:13px;color:#3f3f46">
                <span style="color:${MUTED};font-size:12px;display:block;margin-bottom:4px">Código de rastreio</span>
                <span style="font-size:16px;font-weight:bold;letter-spacing:0.5px;color:${INK}">${escapeHtml(order.trackingCode ?? "—")}</span>
              </td>
            </tr>
          </table>`,
        cta: order.trackingUrl
          ? { label: "Rastrear pela transportadora", href: order.trackingUrl }
          : { label: "Acompanhar pedido", href: orderUrl },
      },
      cancelled: {
        title: "Pedido cancelado",
        subject: `Pagamento não confirmado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 12px">Olá, ${escapeHtml(order.customerName)}! Não recebemos a confirmação do pagamento do pedido <strong>#${order.number}</strong>, então ele foi cancelado.</p>
          <p style="margin:0">Se você ainda quiser os produtos, pode refazer o pedido na loja — será um prazer atendê-lo.</p>`,
        cta: { label: "Voltar às compras", href: SITE_URL },
      },
      refunded: {
        title: "Reembolso realizado",
        subject: `Reembolso — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 12px">Olá, ${escapeHtml(order.customerName)}! O valor do pedido <strong>#${order.number}</strong> foi reembolsado.</p>
          <p style="margin:0 0 12px">O prazo para o dinheiro cair na sua conta depende da sua instituição financeira (geralmente de 1 a 7 dias úteis).</p>
          <p style="margin:0;font-size:13px;color:${MUTED}">Se precisar de ajuda, é só responder este e-mail.</p>`,
        cta: { label: "Fazer novo pedido", href: SITE_URL },
      },
    };

    const msg = bodyByKind[kind];

    const html = renderEmailLayout({
      title: msg.title,
      bodyHtml: msg.bodyHtml,
      cta: msg.cta,
    });

    return sendEmail({ to: order.email, subject: msg.subject, html });
  } catch (error) {
    console.error(`[mail] Falha ao montar e-mail do pedido ${orderId} (${kind}):`, error);
    return false;
  }
}
