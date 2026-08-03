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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BACKGROUND};padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
            <tr>
              <td align="center" style="padding:32px 24px;background:#ffffff">
                <a href="${SITE_URL}" style="text-decoration:none">
                  <img src="${logoUrl}" alt="${SITE_NAME}" width="170" style="width:auto;max-height:76px;display:block;margin:0 auto" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="height:6px;background:${BRAND};font-size:0;line-height:0">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 36px;color:${INK}">
                <h1 style="margin:0 0 8px;font-size:26px;line-height:1.25;color:${INK}">${escapeHtml(title)}</h1>
                <div style="width:44px;height:3px;background:${BRAND};margin:0 0 20px"></div>
                <div style="font-size:16px;line-height:1.7;color:#3f3f46">${bodyHtml}</div>
                ${
                  cta
                    ? `<p style="margin:30px 0 6px">
                        <a href="${cta.href}" style="background:${BRAND};color:#ffffff;padding:14px 30px;border-radius:9px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">${escapeHtml(cta.label)}</a>
                      </p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px;background:#fafafa;border-top:1px solid ${BORDER};text-align:center">
                <p style="margin:0 0 10px;font-size:13px;color:${MUTED}">${SITE_NAME} — compras seguras · entrega em todo o Brasil</p>
                <p style="margin:0;font-size:13px;color:#a1a1aa">
                  <a href="${SITE_URL}" style="color:${MUTED};text-decoration:none">Loja</a> ·
                  <a href="${SITE_URL}/conta/pedidos" style="color:${MUTED};text-decoration:none">Meus pedidos</a> ·
                  <a href="${SITE_URL}/contato" style="color:${MUTED};text-decoration:none">Contato</a>
                </p>
                <p style="margin:12px 0 0;font-size:12px;color:#a1a1aa">Este e-mail foi enviado automaticamente pelo sistema de ${SITE_NAME}. Se você tiver dúvidas, é só responder esta mensagem.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
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
          <td width="76" style="padding:14px 12px;border-bottom:1px solid ${BORDER};vertical-align:top">
            ${
              img
                ? `<img src="${img}" alt="" width="64" height="64" style="width:64px;height:64px;object-fit:cover;border-radius:10px;display:block" />`
                : `<div style="width:64px;height:64px;border-radius:10px;background:#f4f4f5"></div>`
            }
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid ${BORDER};vertical-align:top;font-size:14px;color:#3f3f46">
            <div style="font-weight:bold;color:${INK};font-size:15px;margin-bottom:4px">${escapeHtml(item.name)}</div>
            <div style="color:${MUTED};font-size:13px">Ref.: ${escapeHtml(item.sku)}</div>
            <div style="margin-top:4px;font-size:14px">${item.quantity}x ${formatBRL(Number(item.unitPrice))}</div>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid ${BORDER};vertical-align:top;text-align:right;white-space:nowrap;font-size:15px;font-weight:bold;color:${INK}">
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
        <td style="background:#fafafa;padding:14px;font-size:14px;font-weight:bold;color:${INK}">Produtos</td>
        <td style="background:#fafafa;padding:14px;font-size:14px;font-weight:bold;text-align:right;color:${INK}">Total</td>
      </tr>
      ${rows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0">
      <tr>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Subtotal</td>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED};text-align:right">${formatBRL(Number(order.subtotal))}</td>
      </tr>
      ${
        discount > 0
          ? `<tr>
              <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Desconto</td>
              <td style="padding:6px 4px;font-size:14px;color:#16a34a;text-align:right">- ${formatBRL(discount)}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED}">Frete</td>
        <td style="padding:6px 4px;font-size:14px;color:${MUTED};text-align:right">${formatBRL(shipping)}</td>
      </tr>
      <tr>
        <td style="padding:10px 4px 4px;border-top:2px solid ${BORDER};font-size:16px;font-weight:bold;color:${INK}">Total do pedido</td>
        <td style="padding:10px 4px 4px;border-top:2px solid ${BORDER};font-size:18px;font-weight:bold;text-align:right;color:${BRAND}">${formatBRL(Number(order.total))}</td>
      </tr>
    </table>`;
}

function renderShippingBlock(input: {
  shippingService: string | null;
  shippingEstimateDays: number | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
}): string {
  const trackingCode = input.trackingCode ?? null;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
      ${
        input.shippingService
          ? `<tr>
              <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED};margin-bottom:4px">Forma de envio</div>
                <strong style="color:${INK};font-size:15px">${escapeHtml(input.shippingService)}</strong>
                ${
                  input.shippingEstimateDays
                    ? ` <span style="color:${MUTED}">· prazo estimado de <strong style="color:${INK}">${input.shippingEstimateDays} dia${input.shippingEstimateDays > 1 ? "s" : ""} útil${input.shippingEstimateDays > 1 ? "eis" : ""}</strong></span>`
                    : ""
                }
              </td>
            </tr>`
          : ""
      }
      ${
        trackingCode
          ? `<tr>
              <td style="padding:14px 16px;font-size:14px;color:#3f3f46">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED};margin-bottom:6px">Código de rastreio</div>
                <div style="font-size:18px;font-weight:bold;letter-spacing:0.5px;color:${INK}">${escapeHtml(trackingCode)}</div>
                ${
                  input.trackingUrl
                    ? `<div style="margin-top:8px"><a href="${input.trackingUrl}" style="color:${BRAND};font-weight:bold;font-size:14px">Rastrear pela transportadora</a></div>`
                    : ""
                }
              </td>
            </tr>`
          : ""
      }
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
      <p style="margin:0 0 16px">Olá, ${escapeHtml(input.name)}! Recebemos um pedido para redefinir a senha da sua conta em <strong>${SITE_NAME}</strong>.</p>
      <p style="margin:0 0 16px">Não se preocupe, acontece com todo mundo. Para criar uma nova senha, clique no botão abaixo:</p>
      <p style="margin:0 0 16px;font-size:14px;color:${MUTED}">O link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.</p>
      <p style="margin:0;font-size:13px;color:${MUTED}">Se você não pediu a redefinição, pode ignorar este e-mail — sua senha continua a mesma e sua conta permanece segura.</p>`,
    cta: { label: "Redefinir senha", href: input.resetUrl },
  });

  return sendEmail({ to: input.to, subject: `Redefinição de senha — ${SITE_NAME}`, html });
}

export async function sendWelcomeEmail(input: { to: string; name: string }): Promise<boolean> {
  const html = renderEmailLayout({
    title: `Bem-vindo à ${SITE_NAME}!`,
    bodyHtml: `
      <p style="margin:0 0 16px">Olá, ${escapeHtml(input.name)}! Sua conta em <strong>${SITE_NAME}</strong> foi criada com sucesso. Que bom ter você por aqui!</p>
      <p style="margin:0 0 16px">Criar uma conta é só o começo — com ela você aproveita tudo o que a loja oferece:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46"><strong style="color:${BRAND}">Pedidos:</strong> acompanhe cada compra e a entrega em tempo real</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46"><strong style="color:${BRAND}">Praticidade:</strong> checkout mais rápido com seus dados e endereços salvos</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#3f3f46"><strong style="color:${BRAND}">Vantagens:</strong> receba novidades, cupons e ofertas em primeira mão</td>
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

    const payment = order.payments[0];
    const methodLabel = order.paymentMethod
      ? (PAYMENT_METHOD[order.paymentMethod as keyof typeof PAYMENT_METHOD] ?? String(order.paymentMethod))
      : "Pagamento";
    const orderUrl = `${SITE_URL}/conta/pedidos/${order.number}`;
    const summary = renderOrderSummary(order as unknown as OrderSummaryData);
    const shippingBlock = renderShippingBlock({
      shippingService: order.shippingService,
      shippingEstimateDays: order.shippingEstimateDays,
      trackingCode: order.trackingCode,
      trackingUrl: order.trackingUrl,
    });
    const orderDate = formatDate(order.createdAt);

    const installmentsLabel =
      order.installments && order.installments > 1
        ? ` em ${order.installments}x`
        : "";
    const cardLabel =
      payment?.cardBrand || payment?.cardLast4
        ? ` (${payment.cardBrand ?? ""}${payment.cardLast4 ? ` final ${payment.cardLast4}` : ""})`.trim()
        : "";

    const bodyByKind: Record<
      OrderEmailKind,
      { title: string; subject: string; bodyHtml: string; cta: { label: string; href: string } }
    > = {
      created: {
        title: "Pedido confirmado",
        subject: `Pedido #${order.number} confirmado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}! Recebemos o seu pedido <strong>#${order.number}</strong> feito em <strong>${orderDate}</strong> e já estamos cuidando dele.</p>
          ${summary}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED};margin-bottom:4px">Forma de pagamento</div>
                <strong style="color:${INK};font-size:15px">${escapeHtml(methodLabel)}${installmentsLabel}</strong>${cardLabel ? ` · ${escapeHtml(cardLabel)}` : ""}
              </td>
            </tr>
            ${
              payment?.method === "PIX"
                ? `<tr>
                    <td style="padding:14px 16px;font-size:14px;color:#3f3f46"><strong style="color:${BRAND}">Pagamento pendente.</strong> Finalize o Pix na página do pedido para confirmar a compra. Enquanto isso, seu pedido está reservado.</td>
                  </tr>`
                : `<tr>
                    <td style="padding:14px 16px;font-size:14px;color:#3f3f46">Assim que a operadora confirmar o pagamento, você receberá a confirmação por aqui.</td>
                  </tr>`
            }
          </table>
          ${shippingBlock}
          <p style="margin:16px 0 0;font-size:14px;color:#3f3f46"><strong style="color:${INK}">Próximos passos:</strong></p>
          <ol style="margin:6px 0 0 18px;padding:0;font-size:14px;color:#3f3f46;line-height:1.8">
            <li>Confira os itens e o endereço de entrega na página do pedido.</li>
            <li>Acompanhe o status por aqui — avisamos a cada atualização.</li>
            <li>Receba o código de rastreio assim que o pedido for enviado.</li>
          </ol>`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      paid: {
        title: "Pagamento aprovado",
        subject: `Pagamento aprovado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}! O pagamento do seu pedido <strong>#${order.number}</strong> foi aprovado com sucesso. Muito obrigado pela compra!</p>
          ${summary}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED};margin-bottom:4px">Pagamento</div>
                <strong style="color:${INK};font-size:15px">${escapeHtml(methodLabel)}${installmentsLabel}</strong>${cardLabel ? ` · ${escapeHtml(cardLabel)}` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#3f3f46">Pagamento realizado em <strong style="color:${INK}">${orderDate}</strong>. Status: <strong style="color:#16a34a">Aprovado</strong>.</td>
            </tr>
          </table>
          ${shippingBlock}
          <p style="margin:16px 0 0;font-size:14px;color:#3f3f46">Já estamos separando e preparando o seu pedido para envio. Assim que ele sair da nossa loja, você recebe o código de rastreio por aqui.</p>`,
        cta: { label: "Acompanhar pedido", href: orderUrl },
      },
      shipped: {
        title: "Seu pedido foi enviado",
        subject: `Pedido #${order.number} enviado — ${SITE_NAME}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}! Boa notícia: o seu pedido <strong>#${order.number}</strong> saiu da nossa loja e está a caminho. Hora de acompanhar a entrega!</p>
          ${summary}
          ${shippingBlock}
          ${
            order.trackingUrl
              ? `<p style="margin:0 0 8px;font-size:14px;color:#3f3f46">Clique no botão abaixo para acompanhar a entrega em tempo real pela transportadora.</p>`
              : `<p style="margin:0 0 8px;font-size:14px;color:#3f3f46">Guarde o código de rastreio acima para consultar a entrega na página da transportadora. Ele também fica disponível na página do pedido.</p>`
          }
          <p style="margin:0;font-size:14px;color:#3f3f46">O prazo de entrega começa a contar a partir de hoje. Se algo não chegar no prazo, é só nos avisar.</p>`,
        cta: order.trackingUrl
          ? { label: "Rastrear pela transportadora", href: order.trackingUrl }
          : { label: "Acompanhar pedido", href: orderUrl },
      },
      cancelled: {
        title: "Pedido cancelado",
        subject: `Pagamento não confirmado — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}! O pedido <strong>#${order.number}</strong>, feito em <strong>${orderDate}</strong>, foi cancelado porque não recebemos a confirmação do pagamento.</p>
          <p style="margin:0 0 16px">Nenhum valor foi cobrado — ou, se houve qualquer tentativa, a operadora bloqueia a cobrança automaticamente.</p>
          <p style="margin:0">Se você ainda quiser os produtos, é rapidinho: é só refazer o pedido na loja. Estamos à disposição para ajudar no que precisar.</p>`,
        cta: { label: "Voltar às compras", href: SITE_URL },
      },
      refunded: {
        title: "Reembolso realizado",
        subject: `Reembolso — Pedido #${order.number}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Olá, ${escapeHtml(order.customerName)}! Informamos que o valor do pedido <strong>#${order.number}</strong> foi <strong>reembolsado</strong> com sucesso.</p>
          <p style="margin:0 0 16px">O dinheiro volta para a mesma forma de pagamento utilizada na compra. O prazo para aparecer na sua conta depende da instituição financeira:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46"><strong style="color:${INK}">Cartão de crédito</strong> <span style="color:${MUTED}">— até 2 faturas</span></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-size:14px;color:#3f3f46"><strong style="color:${INK}">Pix</strong> <span style="color:${MUTED}">— até 5 dias úteis</span></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:14px;color:#3f3f46"><strong style="color:${INK}">Boleto</strong> <span style="color:${MUTED}">— até 7 dias úteis</span></td>
            </tr>
          </table>
          <p style="margin:0;font-size:14px;color:#3f3f46">Se preferir, você pode usar o valor para fazer um novo pedido. Ficaremos felizes em atendê-lo novamente!</p>`,
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
