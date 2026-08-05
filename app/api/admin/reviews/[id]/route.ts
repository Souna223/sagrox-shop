import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeRecord } from "@/lib/serialize";
import { auditLog } from "@/lib/audit";
import { recomputeProductRating } from "@/lib/reviews";
import { reviewSchema } from "@/lib/validators";
import type { ReviewStatus } from "@/generated/prisma/enums";

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return fail("Avaliação não encontrada.", 404);

    const data: { status?: ReviewStatus; rating?: number; title?: string | null; comment?: string | null } = {};

    if (typeof body.status === "string") {
      if (!STATUSES.includes(body.status as ReviewStatus)) {
        return fail("Status inválido.");
      }
      data.status = body.status as ReviewStatus;
    }

    const parsed = reviewSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    if (parsed.data.rating !== undefined) data.rating = parsed.data.rating;
    if (parsed.data.title !== undefined) data.title = parsed.data.title?.trim() || null;
    if (parsed.data.comment !== undefined) data.comment = parsed.data.comment?.trim() || null;

    if (Object.keys(data).length === 0) {
      return fail("Nenhum campo válido para atualizar.");
    }

    const updated = await prisma.review.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (parsed.data.rating !== undefined || body.status !== undefined) {
      await recomputeProductRating(review.productId);
    }

    await auditLog({
      userId: admin.id,
      action: body.status ? "REVIEW_STATUS_UPDATE" : "REVIEW_UPDATE",
      entityType: "Review",
      entityId: id,
      details: { data },
    });

    return ok(serializeRecord(updated as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return fail("Avaliação não encontrada.", 404);
    await prisma.review.delete({ where: { id } });

    await recomputeProductRating(review.productId);

    await auditLog({
      userId: admin.id,
      action: "REVIEW_DELETE",
      entityType: "Review",
      entityId: id,
    });

    return ok({ message: "Avaliação removida." });
  } catch (error) {
    return handleError(error);
  }
}
