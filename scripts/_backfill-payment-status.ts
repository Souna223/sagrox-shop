import { prisma } from "@/lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    where: { paymentStatus: { in: ["PENDING", "PROCESSING"] } },
    select: { id: true, number: true, status: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } },
  });

  let updated = 0;
  for (const order of orders) {
    const latest = order.payments[0]?.status;
    if (!latest || latest === "PENDING" || latest === "PROCESSING") continue;
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: latest } });
    updated += 1;
    console.log(`#${order.number} (${order.status}): Order.paymentStatus -> ${latest}`);
  }

  console.log(`\nBackfill concluído: ${updated} pedido(s) atualizado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());