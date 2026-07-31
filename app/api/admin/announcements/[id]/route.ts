import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import {
  announcementFieldsSchema,
  validateAnnouncementDates,
  serializeAnnouncement,
} from "@/lib/admin-content";
import { auditLog } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return fail("Anúncio não encontrado.", 404);
    return ok(serializeAnnouncement(announcement as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return fail("Anúncio não encontrado.", 404);

    const body = await request.json();
    const parsed = announcementFieldsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const dateError = validateAnnouncementDates(data);
    if (dateError) return fail(dateError, 422);

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.message !== undefined ? { message: data.message } : {}),
        ...(data.link !== undefined ? { link: data.link } : {}),
        ...(data.startsAt !== undefined ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt !== undefined ? { endsAt: new Date(data.endsAt) } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    await auditLog({
      userId: admin.id,
      action: "ANUNCIO.ATUALIZADO",
      entityType: "announcement",
      entityId: id,
      details: { message: announcement.message, active: announcement.active },
    });

    return ok(serializeAnnouncement(announcement as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return fail("Anúncio não encontrado.", 404);

    await prisma.announcement.delete({ where: { id } });

    await auditLog({
      userId: admin.id,
      action: "ANUNCIO.REMOVIDO",
      entityType: "announcement",
      entityId: id,
      details: { message: existing.message },
    });

    return ok({ id });
  } catch (error) {
    return handleError(error);
  }
}
