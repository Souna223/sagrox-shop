import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return fail("Produto não encontrado.", 404);

    const product = await prisma.product.update({
      where: { id },
      data: { status: "ACTIVE", visibility: "VISIBLE" },
      select: { id: true, slug: true, status: true },
    });

    return ok({ product });
  } catch (error) {
    return handleError(error, "Não foi possível publicar o produto.");
  }
}