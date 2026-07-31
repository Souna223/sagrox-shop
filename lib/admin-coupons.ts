import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/serialize";
import type { CouponType } from "@/generated/prisma/enums";
import type { z } from "zod";
import type { couponSchema } from "@/lib/validators";

type CouponInput = z.infer<typeof couponSchema>;

export function serializeAdminCoupon<T extends Record<string, unknown>>(coupon: T): T {
  return serializeRecord(coupon);
}

export function parseCouponDates(input: CouponInput) {
  return {
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  };
}

export async function ensureUniqueCouponCode(code: string, excludeId?: string): Promise<string> {
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (!existing || existing.id === excludeId) return code;
  throw new Error(`Já existe um cupom com o código "${code}".`);
}

export async function applyCouponPayload(payload: CouponInput, couponId?: string) {
  const { startsAt, expiresAt } = parseCouponDates(payload);

  const data = {
    code: payload.code,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    type: payload.type as CouponType,
    value: payload.value,
    minAmount: payload.minAmount ?? null,
    maxDiscount: payload.maxDiscount ?? null,
    usageLimit: payload.usageLimit ?? null,
    perUserLimit: payload.perUserLimit,
    startsAt,
    expiresAt,
    active: payload.active,
  };

  return couponId
    ? prisma.coupon.update({ where: { id: couponId }, data })
    : prisma.coupon.create({ data });
}
