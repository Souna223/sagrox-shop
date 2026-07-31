import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeAdminCoupon, applyCouponPayload, ensureUniqueCouponCode } from "@/lib/admin-coupons";
import { couponSchema } from "@/lib/validators";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { usedAt: "desc" },
          take: 20,
          include: {
            order: { select: { id: true, number: true, total: true, createdAt: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!coupon) return fail("Cupom não encontrado.", 404);
    return ok(serializeAdminCoupon(coupon as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    void admin;
    const { id } = await params;
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("Cupom não encontrado.", 404);

    try {
      await ensureUniqueCouponCode(parsed.data.code, id);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Já existe")) {
        return fail(error.message, 409);
      }
      throw error;
    }

    const coupon = await applyCouponPayload(parsed.data, id);
    return ok(serializeAdminCoupon(coupon as never));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    void admin;
    const { id } = await params;
    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("Cupom não encontrado.", 404);
    await prisma.coupon.delete({ where: { id } });
    return ok({ message: "Cupom removido." });
  } catch (error) {
    return handleError(error);
  }
}
