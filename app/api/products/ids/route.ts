import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids") ?? "";
  const list = ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (list.length === 0) return ok([]);
  if (list.length > 50) return fail("Muitos itens.", 400);

  const products = await prisma.product.findMany({
    where: { id: { in: list }, status: "ACTIVE", visibility: "VISIBLE" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      freeShipping: true,
      isNew: true,
      ratingAvg: true,
      ratingCount: true,
      images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  const serialized = products.map((p) => ({
    ...p,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    ratingAvg: p.ratingAvg?.toString() ?? "0",
  }));

  return ok(serialized);
}
