import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { faqSchema, serializeFaq } from "@/lib/admin-content";
import { auditLog } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const faq = await prisma.fAQ.findUnique({ where: { id } });
    if (!faq) return fail("FAQ não encontrada.", 404);
    return ok(serializeFaq(faq as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await prisma.fAQ.findUnique({ where: { id } });
    if (!existing) return fail("FAQ não encontrada.", 404);

    const body = await request.json();
    const parsed = faqSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        ...(data.question !== undefined ? { question: data.question } : {}),
        ...(data.answer !== undefined ? { answer: data.answer } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    await auditLog({
      userId: admin.id,
      action: "FAQ.ATUALIZADA",
      entityType: "faq",
      entityId: id,
      details: { question: faq.question, active: faq.active },
    });

    return ok(serializeFaq(faq as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await prisma.fAQ.findUnique({ where: { id } });
    if (!existing) return fail("FAQ não encontrada.", 404);

    await prisma.fAQ.delete({ where: { id } });

    await auditLog({
      userId: admin.id,
      action: "FAQ.REMOVIDA",
      entityType: "faq",
      entityId: id,
      details: { question: existing.question },
    });

    return ok({ id });
  } catch (error) {
    return handleError(error);
  }
}
