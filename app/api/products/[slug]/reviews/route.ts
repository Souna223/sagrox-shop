import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validators";
import { ok, fail, handleError, getSessionUser } from "@/lib/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail("Não autenticado.", 401);

    const { slug } = await params;
    const body = (await request.json()) as unknown;

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const { rating, title, comment } = parsed.data;

    const product = await prisma.product.findUnique({
      where: { slug, status: "ACTIVE", visibility: "VISIBLE" },
      select: { id: true },
    });

    if (!product) {
      return fail("Produto não encontrado.", 404);
    }

    const existing = await prisma.review.findFirst({
      where: { productId: product.id, userId: user.id },
      select: { id: true },
    });

    if (existing) {
      return fail("Você já avaliou este produto.", 409);
    }

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        status: "PENDING",
      },
      include: { user: { select: { name: true } } },
    });

    return ok({ id: review.id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
