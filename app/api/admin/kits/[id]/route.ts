import { prisma } from "@/lib/prisma";
import { kitSchema } from "@/lib/validators";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeKit, applyKitPayload, resolveKit } from "@/lib/kits";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const kit = await prisma.kit.findUnique({
      where: { id },
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
    });

    if (!kit) return fail("Kit não encontrado.", 404);

    const resolved = resolveKit(kit);
    return ok(
      serializeKit({
        ...kit,
        resolved: {
          basePrice: resolved.basePrice,
          unitPrice: resolved.unitPrice,
          compareAtPrice: resolved.compareAtPrice,
          maxQuantity: resolved.maxQuantity,
        },
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.kit.findUnique({ where: { id } });
    if (!existing) return fail("Kit não encontrado.", 404);

    const body = (await request.json()) as unknown;
    const parsed = kitSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const kit = await applyKitPayload(parsed.data, id);
    return ok({ id: kit.id, slug: kit.slug });
  } catch (error) {
    return handleError(error, "Erro ao atualizar o kit.");
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.kit.findUnique({ where: { id } });
    if (!existing) return fail("Kit não encontrado.", 404);

    await prisma.kit.delete({ where: { id } });
    return ok({ message: "Kit removido." });
  } catch (error) {
    return handleError(error, "Não foi possível remover o kit.");
  }
}
