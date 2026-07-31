import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeRecord } from "@/lib/serialize";
import { auditLog } from "@/lib/audit";
import type { ReviewStatus } from "@/generated/prisma/enums";

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !STATUSES.includes(body.status as ReviewStatus)) {
      return fail("Status inválido.");
    }

    const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) return fail("Avaliação não encontrada.", 404);

    const updated = await prisma.review.update({
      where: { id },
      data: { status: body.status as ReviewStatus },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await auditLog({
      userId: admin.id,
      action: "REVIEW_STATUS_UPDATE",
      entityType: "Review",
      entityId: id,
      details: { to: body.status },
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
    const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) return fail("Avaliação não encontrada.", 404);
    await prisma.review.delete({ where: { id } });

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
