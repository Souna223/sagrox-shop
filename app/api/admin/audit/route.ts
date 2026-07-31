import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, handleError } from "@/lib/api";

const ENTITY_TYPES = ["product", "order", "user", "coupon", "review", "announcement", "faq", "setting"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const entityType = (searchParams.get("entityType") ?? "ALL").trim();
    const action = (searchParams.get("action") ?? "").trim();
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 20;

    const where: Record<string, unknown> = {};
    if (ENTITY_TYPES.includes(entityType)) where.entityType = entityType;
    if (action) where.action = { contains: action.toUpperCase(), mode: "insensitive" };
    if (q) {
      where.OR = [
        { entityId: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const serialized = items.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: log.user,
    }));

    return ok({
      items: serialized,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}
