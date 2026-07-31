import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { announcementSchema, serializeAnnouncement } from "@/lib/admin-content";
import { auditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const active = (searchParams.get("active") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (q) where.message = { contains: q, mode: "insensitive" };
    if (active === "ACTIVE") where.active = true;
    if (active === "INACTIVE") where.active = false;

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.announcement.count({ where }),
    ]);

    return ok({
      items: items.map((a) => serializeAnnouncement(a as never)),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const announcement = await prisma.announcement.create({
      data: {
        message: data.message,
        link: data.link ?? null,
        startsAt,
        endsAt: data.endsAt ? new Date(data.endsAt) : new Date(startsAt.getTime() + 365 * 24 * 60 * 60 * 1000),
        active: data.active,
      },
    });

    await auditLog({
      userId: admin.id,
      action: "ANUNCIO.CRIADO",
      entityType: "announcement",
      entityId: announcement.id,
      details: { message: data.message },
    });

    return ok(serializeAnnouncement(announcement as never), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
