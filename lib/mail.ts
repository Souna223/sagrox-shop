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

function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const BRAND = "#c81e2e";
const INK = "#1f2933";
const MUTED = "#6e7a8a";
const BORDER = "#e4e7ec";
const CARD_BG = "#f8fafc";
const BACKGROUND = "#f3f4f6";
const SUCCESS = "#15803d";
const DANGER = "#b91c1c";

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type CtaAction = { label: string; href: string; secondary?: boolean } | null;

type EmailLayoutOptions = {
  subject: string;
  title: string;
  preheader: string;
  bodyHtml: string;
  cta?: CtaAction;
  extraLink?: { label: string; href: string };
  meta?: { label: string; value: string; tone?: "default" | "success" | "danger" | "brand" }[];
};

function renderButton(cta: Exclude<CtaAction, null>): string {
  const isSecondary = Boolean(cta.secondary);
  const bg = isSecondary ? "#ffffff" : BRAND;
  const fg = isSecondary ? INK : "#ffffff";
  const border = isSecondary ? `1px solid ${BORDER}` : `1px solid ${BRAND}`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:30px auto 6px;border-radius:10px">
      <tr>
        <td align="center" style="border-radius:10px;background-color:${bg};border:${border};mso-padding-alt:15px 36px">
          <a href="${cta.href}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:bold;letter-spacing:0.2px;text-decoration:none;color:${fg};border-radius:10px;line-height:1.4">${escapeHtml(cta.label)}</a>
        </td>
      </tr>
    </table>`;
}

function renderMetaCard(
  meta: NonNullable<EmailLayoutOptions["meta"]>,
): string {
  const tds = meta
    .map((row, i) => {
      const tone =
        row.tone === "success"
          ? SUCCESS
          : row.tone === "danger"
            ? DANGER
            : row.tone === "brand"
              ? BRAND
              : INK;
      return `
        <td style="padding:14px 16px;${i > 0 ? `border-left:1px solid ${BORDER};` : ""}vertical-align:top">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:${MUTED};margin-bottom:5px">${escapeHtml(row.label)}</div>
          <div style="font-size:16px;font-weight:700;color:${tone}">${escapeHtml(row.value)}</div>
        </td>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;background-color:${CARD_BG}">
      <tr>${tds}</tr>
    </table>`;
}

function renderCard(title: string, rows: { label: string; value: string }[]): string {
  const rowHtml = rows
    .map(
      (row, i) => `
        <tr>
          <td style="padding:13px 18px;${i < rows.length - 1 ? `border-bottom:1px solid ${BORDER};` : ""}font-size:13px;color:${MUTED};width:46%">${escapeHtml(row.label)}</td>
          <td style="padding:13px 18px;${i < rows.length - 1 ? `border-bottom:1px solid ${BORDER};` : ""}font-size:14px;font-weight:600;color:${INK};text-align:right">${row.value}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
      <tr>
        <td colspan="2" style="padding:13px 18px;background-color:${CARD_BG};border-bottom:1px solid ${BORDER};font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:${MUTED};font-weight:700">${escapeHtml(title)}</td>
      </tr>
      ${rowHtml}
    </table>`;
}

function renderEmailLayout(options: EmailLayoutOptions): string {
  const { subject, title, preheader, bodyHtml, cta, extraLink, meta } = options;
  const logoUrl = `${SITE_URL}/logo.png`;
  const metaCard = meta && meta.length > 0 ? renderMetaCard(meta) : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]><style type="text/css">.container{width:600px !important}</style><![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 24px 20px !important; }
      .footer { padding: 20px 20px !important; }
      .hero { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BACKGROUND};font-family:${FONT_STACK};color:${INK}">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BACKGROUND}" style="background-color:${BACKGROUND}">
    <tr>
      <td align="center" style="padding:32px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
          <tr>
            <td align="center" class="hero" style="padding:36px 24px 30px;background-color:#ffffff">
              <a href="${SITE_URL}" style="text-decoration:none">
                <img src="${logoUrl}" alt="${SITE_NAME}" width="168" style="display:block;margin:0 auto;max-height:80px;width:auto" />
              </a>
              <div style="margin-top:14px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9aa5b1">Compras seguras · Entrega em todo o Brasil</div>
            </td>
          </tr>
          <tr>
            <td style="height:5px;font-size:0;line-height:0;background-color:${BRAND}">&nbsp;</td>
          </tr>
          <tr>
            <td class="content" style="padding:34px 40px;color:${INK}">
              <h1 style="margin:0 0 8px;font-size:25px;line-height:1.3;color:${INK};font-weight:700">${escapeHtml(title)}</h1>
              <div style="width:52px;height:4px;border-radius:2px;background-color:${BRAND};margin:0 0 22px"></div>
              <div style="font-size:15px;line-height:1.7;color:#3e4c59">${bodyHtml}</div>
              ${cta ? renderButton(cta) : ""}
              ${
                extraLink
                  ? `<p style="margin:14px 0 0;text-align:center"><a href="${extraLink.href}" style="color:${MUTED};font-size:13px;text-decoration:underline">${escapeHtml(extraLink.label)}</a></p>`
                  : ""
              }
              ${metaCard}
            </td>
          </tr>
          <tr>
            <td class="footer" style="padding:26px 40px;background-color:${CARD_BG};border-top:1px solid ${BORDER};text-align:center">
              <div style="font-size:15px;font-weight:700;color:${INK};margin-bottom:6px">${escapeHtml(SITE_NAME)}</div>
              <div style="font-size:13px;color:${MUTED};margin-bottom:12px">Compras seguras · Entrega em todo o Brasil</div>
              <div style="font-size:13px;color:${MUTED}">
                <a href="${SITE_URL}" style="color:${MUTED};text-decoration:none">Loja</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/conta/pedidos" style="color:${MUTED};text-decoration:none">Meus pedidos</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/contato" style="color:${MUTED};text-decoration:none">Fale conosco</a>
              </div>
              <div style="margin:14px 0 0;padding-top:14px;border-top:1px solid ${BORDER};font-size:12px;color:#9aa5b1">Você recebeu este e-mail por ter uma conta ou uma compra em ${escapeHtml(SITE_NAME)}. Mensagem enviada automaticamente.</div>
              <div style="margin-top:8px;font-size:12px;color:#9aa5b1">&copy; ${new Date().getFullYear()} ${escapeHtml(SITE_NAME)}. Todos os direitos reservados.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type OrderSummaryItem = {
  name: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
};

type OrderSummaryData = {
  number: number;
  subtotal: string;
  discount: string;
  shippingFee: string;
  total: string;
  items: OrderSummaryItem[];
};

function renderOrderSummary(order: OrderSummaryData): string {
  const rows = order.items
    .map((item) => {
      const img = toAbsoluteUrl(item.imageUrl);
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid ${BORDER};vertical-align:middle">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td width="56" style="vertical-align:middle;padding-right:12px">
                  ${
                    img
                      ? `<img src="${img}" alt="" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;background-color:${CARD_BG}" />`
                      : `<div style="width:56px;height:56px;border-radius:8px;background-color:${CARD_BG}"></div>`
                  }
                </td>
                <td style="vertical-align:middle;font-size:14px;color:#3e4c59">
                  <div style="font-weight:700;color:${INK};font-size:14px;margin-bottom:3px">${escapeHtml(item.name)}</div>
                  <div style="color:${MUTED};font-size:12px">Ref.: ${escapeHtml(item.sku)}</div>
                  <div style="margin-top:3px;font-size:13px;color:${MUTED}">${item.quantity}x ${formatBRL(Number(item.unitPrice))}</div>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid ${BORDER};text-align:right;vertical-align:middle;white-space:nowrap;font-size:14px;font-weight:600;color:${INK}">
            ${formatBRL(Number(item.unitPrice) * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const discount = Number(order.discount);
  const shipping = Number(order.shippingFee);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
      <tr>
        <td colspan="2" style="padding:13px 18px;background-color:${CARD_BG};border-bottom:1px solid ${BORDER};font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:${MUTED};font-weight:700">Itens do pedido</td>
      </tr>
      ${rows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0">
      <tr>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Subtotal</td>
        <td style="padding:6px 4px;font-size:14px;color:${INK};text-align:right">${formatBRL(Number(order.subtotal))}</td>
      </tr>
      ${
        discount > 0
          ? `<tr>
              <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Desconto</td>
              <td style="padding:6px 4px;font-size:14px;color:${SUCCESS};text-align:right">- ${formatBRL(discount)}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Frete</td>
        <td style="padding:6px 4px;font-size:14px;color:${INK};text-align:right">${formatBRL(shipping)}</td>
      </tr>
      <tr>
        <td style="padding:12px 4px 4px;border-top:2px solid ${BORDER};font-size:15px;font-weight:700;color:${INK}">Total do pedido</td>
        <td style="padding:12px 4px 4px;border-top:2px solid ${BORDER};font-size:18px;font-weight:700;text-align:right;color:${BRAND}">${formatBRL(Number(order.total))}</td>
      </tr>
    </table>`;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const { subject, html } = renderPasswordResetEmailHtml(input);
  return sendEmail({ to: input.to, subject, html });
}

export function renderPasswordResetEmailHtml(input: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const subject = `Redefinição de senha — ${SITE_NAME}`;
  const html = renderEmailLayout({
    subject,
    title: "Redefinição de senha",
    preheader: "Clique no botão para criar uma nova senha para a sua conta.",
    bodyHtml: `
      <p style="margin:0 0 16px">Olá, ${escapeHtml(input.name)}!</p>
      <p style="margin:0 0 16px">Recebemos uma solicitação para redefinir a senha da sua conta em <strong>${SITE_NAME}</strong>. Para criar uma nova senha, clique no botão abaixo.</p>
      ${renderCard("Sobre este link", [
        { label: "Validade", value: "1 hora" },
        { label: "Utilização", value: "Uso único" },
      ])}
      <p style="margin:0;font-size:13px;color:${MUTED}">Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma e sua conta permanece segura.</p>`,
    cta: { label: "Redefinir senha", href: input.resetUrl },
    extraLink: { label: "Voltar à loja", href: SITE_URL },
  });

  return { subject, html };
}

export async function sendWelcomeEmail(input: { to: string; name: string }): Promise<boolean> {
  const { subject, html } = renderWelcomeEmailHtml(input);
  return sendEmail({ to: input.to, subject, html });
}

export function renderWelcomeEmailHtml(input: { name: string }): { subject: string; html: string } {
  const subject = `Bem-vindo(a) à ${SITE_NAME}!`;
  const html = renderEmailLayout({
    subject,
    title: `Bem-vindo(a) à ${SITE_NAME}!`,
    preheader: "Sua conta foi criada com sucesso. Explore a loja e aproveite as novidades.",
    bodyHtml: `
      <p style="margin:0 0 16px">Olá, ${escapeHtml(input.name)}!</p>
      <p style="margin:0 0 16px">Sua conta em <strong>${SITE_NAME}</strong> foi criada com sucesso. Que bom ter você por aqui!</p>
      <p style="margin:0 0 8px">Com a sua conta, você aproveita:</p>
      ${renderCard("O que você ganha", [
        { label: "Pedidos", value: "Acompanhe cada compra em tempo real" },
        { label: "Praticidade", value: "Checkout rápido com dados salvos" },
        { label: "Vantagens", value: "Cupons e ofertas em primeira mão" },
      ])}
      <p style="margin:0">Já está tudo pronto. Explore a loja e boa compra!</p>`,
    cta: { label: "Explorar a loja", href: SITE_URL },
  });

  return { subject, html };
}

export type OrderEmailKind = "created" | "paid" | "shipped" | "cancelled" | "refunded";

export type OrderEmailRecord = {
  id: string;
  number: number;
  email: string;
  customerName: string;
  subtotal: string | { toString(): string };
  discount: string | { toString(): string };
  shippingFee: string | { toString(): string };
  total: string | { toString(): string };
  paymentMethod: string | null;
  installments: number | null;
  shippingService: string | null;
  shippingEstimateDays: number | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  createdAt: Date | string;
  items: OrderSummaryItem[];
  payments: { method: string | null; installments: number | null; cardLast4: string | null; cardBrand: string | null }[];
};

export function renderOrderStatusEmailHtml(
  order: OrderEmailRecord,
  kind: OrderEmailKind,
): { subject: string; html: string } {
    const payment = order.payments[0];
    const methodLabel = order.paymentMethod
      ? (PAYMENT_METHOD[order.paymentMethod as keyof typeof PAYMENT_METHOD] ?? String(order.paymentMethod))
      : "Pagamento";
    const orderUrl = `${SITE_URL}/conta/pedidos/${order.number}`;
    const orderDate = formatDate(order.createdAt);
    const isPix = payment?.method === "PIX";

    const installmentsLabel =
      order.installments && order.installments > 1 ? ` em ${order.installments}x` : "";
    const cardLabel =
      payment?.cardBrand || payment?.cardLast4
        ? `${payment.cardBrand ?? ""}${payment.cardLast4 ? ` final ${payment.cardLast4}` : ""}`.trim()
        : "";

    const paymentRows: { label: string; value: string }[] = [
      { label: "Forma de pagamento", value: `<strong>${escapeHtml(methodLabel)}${installmentsLabel}</strong>` },
    ];
    if (cardLabel) paymentRows.push({ label: "Cartão", value: escapeHtml(cardLabel) });
    if (isPix && kind === "created") paymentRows.push({ label: "Situação", value: `<strong style="color:${BRAND}">Aguardando pagamento</strong>` });

    const shippingRows: { label: string; value: string }[] = [];
    if (order.shippingService) shippingRows.push({ label: "Forma de envio", value: `<strong>${escapeHtml(order.shippingService)}</strong>` });
    if (order.shippingEstimateDays) {
      const d = order.shippingEstimateDays;
      shippingRows.push({ label: "Prazo estimado", value: `<strong>${d} dia${d > 1 ? "s" : ""} útil${d > 1 ? "eis" : ""}</strong>` });
    }
    if (order.trackingCode) shippingRows.push({ label: "Código de rastreio", value: `<strong>${escapeHtml(order.trackingCode)}</strong>` });

    const summary = renderOrderSummary(order as unknown as OrderSummaryData);
    const shippingCard = shippingRows.length > 0 ? renderCard("Entrega", shippingRows) : "";
    const paymentCard = renderCard("Pagamento", paymentRows);

    const statusByKind: Record<OrderEmailKind, { label: string; tone: "default" | "success" | "danger" | "brand" }> = {
      created: { label: isPix ? "Aguardando pagamento" : "Aguardando confirmação", tone: "brand" },
      paid: { label: "Pagamento aprovado", tone: "success" },
      shipped: { label: "Enviado", tone: "success" },
      cancelled: { label: "Cancelado", tone: "danger" },
      refunded: { label: "Reembolsado", tone: "success" },
    };

    const status = statusByKind[kind];

    const bodyByKind: Record<
      OrderEmailKind,
      { title: string; subject: string; bodyHtml: string; cta: CtaAction; extraLink?: { label: string; href: string } }
    > = {
      created: {
        title: "Pedido confirmado",
        subject: `Pedido #${order.number} confirmado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}!</p>
          <p style="margin:0 0 16px">Recebemos o seu pedido <strong>#${order.number}</strong> e já estamos cuidando dele.</p>
          ${summary}
          ${paymentCard}
          ${shippingCard}
          <p style="margin:16px 0 0;font-size:14px;color:#3e4c59"><strong style="color:${INK}">Próximos passos</strong></p>
          <ol style="margin:8px 0 0 18px;padding:0;font-size:14px;color:#3e4c59;line-height:1.9">
            <li>Confira os itens e o endereço de entrega na página do pedido.</li>
            <li>Acompanhe o status por aqui — avisamos a cada atualização.</li>
            <li>Receba o código de rastreio assim que o pedido for enviado.</li>
          </ol>
          ${
            isPix
              ? `<p style="margin:16px 0 0;padding:14px 16px;border-radius:10px;background-color:#fff4f5;border:1px solid #fbd5da;font-size:14px;color:#8a1d28"><strong>Pagamento pendente.</strong> Finalize o Pix na página do pedido para confirmar a compra. Enquanto isso, seu pedido está reservado.</p>`
              : ""
          }`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      paid: {
        title: "Pagamento aprovado",
        subject: `Pagamento aprovado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}!</p>
          <p style="margin:0 0 16px">O pagamento do seu pedido <strong>#${order.number}</strong> foi aprovado com sucesso. Muito obrigado pela compra!</p>
          ${summary}
          ${paymentCard}
          ${shippingCard}
          <p style="margin:16px 0 0;font-size:14px;color:#3e4c59">Já estamos separando e preparando o seu pedido para envio. Assim que ele sair da nossa loja, você recebe o código de rastreio por aqui.</p>`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      shipped: {
        title: "Seu pedido foi enviado",
        subject: `Pedido #${order.number} enviado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}!</p>
          <p style="margin:0 0 16px">Boa notícia: o seu pedido <strong>#${order.number}</strong> saiu da nossa loja e está a caminho.</p>
          ${summary}
          ${paymentCard}
          ${shippingCard}
          <p style="margin:16px 0 0;font-size:14px;color:#3e4c59">${
            order.trackingUrl
              ? "Use o botão abaixo para acompanhar a entrega em tempo real pela transportadora."
              : "Guarde o código de rastreio acima para consultar a entrega na página da transportadora. Ele também fica disponível na página do pedido."
          }</p>`,
        cta: order.trackingUrl
          ? { label: "Rastrear pela transportadora", href: order.trackingUrl }
          : { label: "Acompanhar pedido", href: orderUrl },
      },
      cancelled: {
        title: "Pedido cancelado",
        subject: `Pagamento não confirmado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}!</p>
          <p style="margin:0 0 16px">O pedido <strong>#${order.number}</strong> foi cancelado porque não recebemos a confirmação do pagamento.</p>
          <p style="margin:0 0 16px">Nenhum valor foi cobrado — e, se houve qualquer tentativa, a operadora bloqueia a cobrança automaticamente.</p>
          <p style="margin:0;font-size:14px;color:#3e4c59">Se você ainda quiser os produtos, é rápido: é só refazer o pedido na loja. Estamos à disposição para ajudar.</p>`,
        cta: { label: "Voltar às compras", href: SITE_URL },
        extraLink: { label: "Entrar em contato", href: `${SITE_URL}/contato` },
      },
      refunded: {
        title: "Reembolso realizado",
        subject: `Reembolso — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}!</p>
          <p style="margin:0 0 16px">Informamos que o valor do pedido <strong>#${order.number}</strong> foi <strong>reembolsado</strong> com sucesso.</p>
          <p style="margin:0 0 8px">O dinheiro volta para a mesma forma de pagamento da compra. O prazo para aparecer na sua conta depende da instituição financeira:</p>
          ${renderCard("Prazos de reembolso", [
            { label: "Cartão de crédito", value: "Até 2 faturas" },
            { label: "Pix", value: "Até 5 dias úteis" },
            { label: "Boleto", value: "Até 7 dias úteis" },
          ])}
          <p style="margin:0;font-size:14px;color:#3e4c59">Se preferir, você pode usar o valor para fazer um novo pedido. Será um prazer atendê-lo novamente!</p>`,
        cta: { label: "Fazer novo pedido", href: SITE_URL },
        extraLink: { label: "Entrar em contato", href: `${SITE_URL}/contato` },
      },
    };

    const msg = bodyByKind[kind];

    const html = renderEmailLayout({
      subject: msg.subject,
      title: msg.title,
      preheader: `${status.label} — Pedido #${order.number} · ${SITE_NAME}`,
      bodyHtml: msg.bodyHtml,
      cta: msg.cta,
      extraLink: msg.extraLink,
      meta: [
        { label: "Pedido", value: `#${order.number}` },
        { label: "Data", value: orderDate },
        { label: "Status", value: status.label, tone: status.tone },
      ],
    });

    return { subject: msg.subject, html };
}

export async function sendOrderStatusEmail(orderId: string, kind: OrderEmailKind): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        email: true,
        customerName: true,
        subtotal: true,
        discount: true,
        shippingFee: true,
        total: true,
        paymentMethod: true,
        installments: true,
        shippingService: true,
        shippingEstimateDays: true,
        trackingCode: true,
        trackingUrl: true,
        createdAt: true,
        items: { select: { name: true, sku: true, imageUrl: true, quantity: true, unitPrice: true } },
        payments: {
          select: { method: true, installments: true, cardLast4: true, cardBrand: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!order) return false;

    const { subject, html } = renderOrderStatusEmailHtml(order as unknown as OrderEmailRecord, kind);
    return sendEmail({ to: order.email, subject, html });
  } catch (error) {
    console.error(`[mail] Falha ao montar e-mail do pedido ${orderId} (${kind}):`, error);
    return false;
  }
}
