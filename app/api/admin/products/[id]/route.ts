import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeAdminProduct, applyProductPayload } from "@/lib/admin-products";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true, sortOrder: true } },
        variations: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, stock: true, imageUrl: true, attributes: true, active: true },
        },
      },
    });

    if (!product) return fail("Produto não encontrado.", 404);
    return ok(serializeAdminProduct(product));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return fail("Produto não encontrado.", 404);

    const body = (await request.json()) as unknown;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const product = await applyProductPayload(parsed.data, id);
    return ok({ id: product.id, slug: product.slug });
  } catch (error) {
    return handleError(error, "Erro ao atualizar o produto.");
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return fail("Produto não encontrado.", 404);

    await prisma.product.delete({ where: { id } });
    return ok({ message: "Produto removido." });
  } catch (error) {
    return handleError(error, "Não foi possível remover o produto.");
  }
}
