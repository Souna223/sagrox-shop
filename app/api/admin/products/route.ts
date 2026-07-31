import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeAdminProduct, applyProductPayload } from "@/lib/admin-products";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status") ?? "ALL";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const perPage = Math.min(50, Math.max(1, Number(url.searchParams.get("perPage") ?? 15)));

    const where = {
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] }
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
          updatedAt: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          _count: { select: { variations: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return ok({
      items: items.map(serializeAdminProduct),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as unknown;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const product = await applyProductPayload(parsed.data);
    return ok({ id: product.id, slug: product.slug }, { status: 201 });
  } catch (error) {
    return handleError(error, "Erro ao criar o produto.");
  }
}
