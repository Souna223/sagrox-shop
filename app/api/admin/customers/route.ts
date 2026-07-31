import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeRecord } from "@/lib/serialize";
import type { Role } from "@/generated/prisma/enums";

const ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CUSTOMER"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const role = (searchParams.get("role") ?? "CUSTOMER").trim();
    const blocked = (searchParams.get("blocked") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { cpf: { contains: q.replace(/\D/g, "") } },
        { phone: { contains: q.replace(/\D/g, "") } },
      ];
    }
    if (ROLES.includes(role as Role)) {
      where.role = role as Role;
    }
    if (blocked === "BLOCKED") where.isBlocked = true;
    if (blocked === "ACTIVE") where.isBlocked = false;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          isBlocked: true,
          isVip: true,
          newsletter: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true, addresses: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok({
      items: items.map((item) => serializeRecord(item as never)),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}

export function POST() {
  return fail("Operação não suportada.", 405);
}
