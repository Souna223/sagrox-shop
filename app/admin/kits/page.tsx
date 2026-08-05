import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serializeKit, resolveKit } from "@/lib/kits";
import { KitsTable } from "@/components/admin/kits-table";

export const metadata: Metadata = {
  title: "Kits",
};

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

export default async function AdminKitsPage({ searchParams }: PageProps) {
  const { q = "", status = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.kit.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        items: {
          orderBy: { id: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                weight: true,
                images: { where: { isMain: true }, take: 1, select: { url: true } },
              },
            },
            variation: {
              select: { id: true, name: true, sku: true, price: true, stock: true, imageUrl: true },
            },
          },
        },
      },
    }),
    prisma.kit.count({ where }),
  ]);

  const rows = items.map((kit) => {
    const resolved = resolveKit(kit);
    return {
      ...serializeKit({
        id: kit.id,
        name: kit.name,
        slug: kit.slug,
        sku: kit.sku,
        image: kit.image,
        status: kit.status,
        updatedAt: kit.updatedAt,
      }),
      unitPrice: resolved.unitPrice,
      compareAtPrice: resolved.compareAtPrice,
      maxQuantity: resolved.maxQuantity,
      itemsCount: kit.items.length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} kit{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}.
        </p>
      </div>
      <KitsTable
        initial={{
          items: rows as never,
          total,
          page,
          totalPages: Math.ceil(total / perPage),
        }}
        q={q}
        status={status}
      />
    </div>
  );
}
