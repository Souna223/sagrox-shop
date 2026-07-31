import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeAdminCoupon, applyCouponPayload, ensureUniqueCouponCode } from "@/lib/admin-coupons";
import { couponSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const active = (searchParams.get("active") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { code: { contains: q.toUpperCase(), mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }
    if (active === "ACTIVE") where.active = true;
    if (active === "INACTIVE") where.active = false;

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { _count: { select: { usages: true } } },
      }),
      prisma.coupon.count({ where }),
    ]);

    return ok({
      items: items.map((c) => serializeAdminCoupon(c as never)),
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
    void admin;
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    try {
      await ensureUniqueCouponCode(parsed.data.code);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Já existe")) {
        return fail(error.message, 409);
      }
      throw error;
    }

    const coupon = await applyCouponPayload(parsed.data);
    return ok(serializeAdminCoupon(coupon as never), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
