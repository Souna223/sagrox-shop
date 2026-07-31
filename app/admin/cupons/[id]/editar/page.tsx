import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CouponForm } from "@/components/admin/coupon-form";

export const metadata: Metadata = {
  title: "Editar cupom",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCouponPage({ params }: PageProps) {
  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) notFound();

  return (
    <CouponForm
      couponId={coupon.id}
      initial={{
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: Number(coupon.value.toString()),
        minAmount: coupon.minAmount ? Number(coupon.minAmount.toString()) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount.toString()) : null,
        usageLimit: coupon.usageLimit,
        perUserLimit: coupon.perUserLimit,
        startsAt: coupon.startsAt?.toISOString() ?? null,
        expiresAt: coupon.expiresAt?.toISOString() ?? null,
        active: coupon.active,
      }}
    />
  );
}
