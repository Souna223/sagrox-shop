import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CouponsTable } from "@/components/admin/coupons-table";

export const metadata: Metadata = {
  title: "Cupons",
};

type PageProps = {
  searchParams: Promise<{ q?: string; active?: string; page?: string }>;
};

export default async function AdminCouponsPage({ searchParams }: PageProps) {
  const { q = "", active = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where: Record<string, unknown> = {};
  if (q.trim()) {
    where.OR = [
      { code: { contains: q.toUpperCase(), mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (active === "ACTIVE") where.active = true;
  if (active === "INACTIVE") where.active = false;

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { usages: true } } },
    }),
    prisma.coupon.count({ where }),
  ]);

  const serialized = items.map((coupon) => ({
    ...coupon,
    value: Number(coupon.value.toString()),
    minAmount: coupon.minAmount ? Number(coupon.minAmount.toString()) : null,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount.toString()) : null,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} cupom{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}.
        </p>
      </div>
      <CouponsTable
        initial={{ items: serialized, total, page, totalPages: Math.ceil(total / perPage) }}
        q={q}
        active={active}
      />
    </div>
  );
}
