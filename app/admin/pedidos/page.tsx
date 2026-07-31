import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata: Metadata = {
  title: "Pedidos",
};

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const ORDER_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { q = "", status = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where: Record<string, unknown> = {};
  if (q.trim()) {
    const numericQ = Number(q);
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      ...(Number.isInteger(numericQ) ? [{ number: numericQ }] : []),
    ];
  }
  if (ORDER_STATUSES.includes(status)) {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        number: true,
        customerName: true,
        email: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const serialized = items.map((order) => ({
    ...order,
    total: Number(order.total.toString()),
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} pedido{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"}.
        </p>
      </div>
      <OrdersTable
        initial={{ items: serialized, total, page, totalPages: Math.ceil(total / perPage) }}
        q={q}
        status={status}
      />
    </div>
  );
}
