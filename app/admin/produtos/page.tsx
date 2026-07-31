import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serializeAdminProduct } from "@/lib/admin-products";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata: Metadata = {
  title: "Produtos",
};

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
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
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        lowStockThreshold: true,
        status: true,
        visibility: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { variations: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} produto{total === 1 ? "" : "s"} cadastrado{total === 1 ? "" : "s"}.
        </p>
      </div>
      <ProductsTable
        initial={{
          items: items.map((item) => serializeAdminProduct(item)) as never,
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
