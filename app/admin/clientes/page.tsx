import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CustomersTable } from "@/components/admin/customers-table";

export const metadata: Metadata = {
  title: "Clientes",
};

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; blocked?: string; page?: string }>;
};

const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE", "CUSTOMER"];

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const { q = "", role = "CUSTOMER", blocked = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where: Record<string, unknown> = {};
  if (q.trim()) {
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      ...(digits ? [{ cpf: { contains: digits } }, { phone: { contains: digits } }] : []),
    ];
  }
  if (ROLES.includes(role)) where.role = role;
  if (blocked === "BLOCKED") where.isBlocked = true;
  if (blocked === "ACTIVE") where.isBlocked = false;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        isBlocked: true,
        isVip: true,
        newsletter: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true, addresses: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    lastLoginAt: item.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} cliente{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}.
        </p>
      </div>
      <CustomersTable
        initial={{ items: serialized, total, page, totalPages: Math.ceil(total / perPage) }}
        q={q}
        role={role}
        blocked={blocked}
      />
    </div>
  );
}
