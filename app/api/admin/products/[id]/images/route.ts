import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const body = (await request.json()) as { images?: unknown };
    if (!Array.isArray(body.images) || body.images.some((u) => typeof u !== "string")) {
      return fail("Lista de imagens inválida.", 422);
    }

    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!product) return fail("Produto não encontrado.", 404);

    const urls = body.images.filter((u) => u.trim()) as string[];

    await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (urls.length > 0) {
        await tx.productImage.createMany({
          data: urls.map((url, index) => ({
            url,
            alt: product.name,
            sortOrder: index,
            isMain: index === 0,
            productId: id,
          })),
        });
      }
    });

    return ok({ images: urls });
  } catch (error) {
    return handleError(error, "Não foi possível atualizar as imagens.");
  }
}
