import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma";
import {
  buildResetPasswordUrl,
  renderPasswordResetEmailHtml,
  renderWelcomeEmailHtml,
  renderOrderStatusEmailHtml,
  type OrderEmailKind,
  type OrderEmailRecord,
} from "../lib/mail";

const OUT_DIR = join(process.cwd(), "emails-preview");

function write(kind: string, subject: string, html: string): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${kind}.html`);
  writeFileSync(file, html, "utf8");
  console.log(`[ok] ${kind.padEnd(16)} -> ${file}  (${subject})`);
  return file;
}

async function main() {
  const reset = renderPasswordResetEmailHtml({
    name: "Maria Silva",
    resetUrl: buildResetPasswordUrl("test-token-123"),
  });
  write("password-reset", reset.subject, reset.html);

  const welcome = renderWelcomeEmailHtml({ name: "Maria Silva" });
  write("welcome", welcome.subject, welcome.html);

  const order = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
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

  if (!order) {
    console.log("[warn] Nenhum pedido encontrado no banco para renderizar os e-mails de pedido.");
    console.log(`Arquivos gerados em: ${OUT_DIR}`);
    return;
  }

  console.log(`[info] Usando pedido #${order.number} (${order.customerName})`);
  const record = order as unknown as OrderEmailRecord;

  for (const kind of ["created", "paid", "shipped", "cancelled", "refunded"] as OrderEmailKind[]) {
    const msg = renderOrderStatusEmailHtml(record, kind);
    write(`order-${kind}`, msg.subject, msg.html);
  }

  console.log(`\nPrévia gerada em: ${OUT_DIR}`);
  console.log("Abra os arquivos .html no navegador para revisar o design.");
}

main()
  .catch((err) => {
    console.error("[erro]", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
