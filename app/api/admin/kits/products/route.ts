import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, handleError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";

    const products = await prisma.product.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { sku: { contains: q, mode: "insensitive" as const } },
                { slug: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        stock: true,
        images: { where: { isMain: true }, take: 1, select: { url: true } },
        variations: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sku: true, price: true, stock: true, imageUrl: true },
        },
      },
    });

    return ok(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price),
        stock: p.stock,
        image: p.images[0]?.url ?? null,
        variations: p.variations.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price != null ? Number(v.price) : Number(p.price),
          stock: v.stock,
          imageUrl: v.imageUrl,
        })),
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}
