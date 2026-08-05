import { prisma } from "@/lib/prisma";
import { kitSchema } from "@/lib/validators";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeKit, applyKitPayload, resolveKit } from "@/lib/kits";

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

    const [kits, total] = await Promise.all([
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

    const items = kits.map((kit) => {
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

    return ok({ items, total, page, perPage, totalPages: Math.ceil(total / perPage) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as unknown;
    const parsed = kitSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const kit = await applyKitPayload(parsed.data);
    return ok({ id: kit.id, slug: kit.slug }, { status: 201 });
  } catch (error) {
    return handleError(error, "Erro ao criar o kit.");
  }
}
