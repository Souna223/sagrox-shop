import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError, getClientIp } from "@/lib/api";
import { serializeRecord } from "@/lib/serialize";
import { auditLog } from "@/lib/audit";
import type { Role } from "@/generated/prisma/enums";

const ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CUSTOMER"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        customerNotes: {
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { id: true, name: true } } },
        },
        referredBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlistItems: true,
            referralOf: true,
          },
        },
      },
    });

    if (!user) return fail("Cliente não encontrado.", 404);

    const [orders, totals] = await Promise.all([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          createdAt: true,
          paymentMethod: true,
        },
      }),
      prisma.order.aggregate({
        where: { userId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    const data = serializeRecord(user as never) as Record<string, unknown>;
    return ok({
      ...data,
      recentOrders: orders.map((o) => ({ ...o, total: Number(o.total.toString()) })),
      lifetimeTotal: totals._sum.total ? Number(totals._sum.total.toString()) : 0,
      orderCount: totals._count,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      isBlocked?: boolean;
      isVip?: boolean;
      isActive?: boolean;
      role?: string;
      newsletter?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (typeof body.isBlocked === "boolean") data.isBlocked = body.isBlocked;
    if (typeof body.isVip === "boolean") data.isVip = body.isVip;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.newsletter === "boolean") data.newsletter = body.newsletter;
    if (body.role) {
      if (!ROLES.includes(body.role as Role)) return fail("Perfil inválido.");
      data.role = body.role as Role;
    }

    if (Object.keys(data).length === 0) return fail("Nenhum campo para atualizar.");

    const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existingUser) return fail("Cliente não encontrado.", 404);

    const user = await prisma.user.update({
      where: { id },
      data: data as never,
      select: { id: true, name: true, email: true, role: true, isBlocked: true, isActive: true, isVip: true, newsletter: true },
    });

    await auditLog({
      userId: admin.id,
      action: "CUSTOMER_UPDATE",
      entityType: "User",
      entityId: id,
      details: data,
      ip: getClientIp(request),
    });

    return ok(user);
  } catch (error) {
    return handleError(error);
  }
}
