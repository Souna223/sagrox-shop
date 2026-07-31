import { MIN_INSTALLMENT_VALUE } from "@/lib/constants";

export type PriceInfo = {
  price: number;
  compareAtPrice?: number | null;
  discountPercent: number;
  hasDiscount: boolean;
  installment: number;
  installmentValue: number;
  maxInstallments: number;
};

export function getMaxInstallments(price: number): number {
  const max = Math.floor(price / MIN_INSTALLMENT_VALUE);
  return Math.min(Math.max(max, 1), 12);
}

export function calcPriceInfo(price: number, compareAtPrice?: number | null): PriceInfo {
  const hasDiscount = !!compareAtPrice && compareAtPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100) : 0;
  const maxInstallments = getMaxInstallments(price);
  const installmentValue = maxInstallments > 0 ? price / maxInstallments : price;

  return {
    price,
    compareAtPrice: compareAtPrice ?? null,
    discountPercent,
    hasDiscount,
    installment: maxInstallments,
    installmentValue,
    maxInstallments,
  };
}

export function applyCouponDiscount(
  subtotal: number,
  coupon: { type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: number; maxDiscount?: number | null },
): { discount: number; freeShipping: boolean } {
  if (coupon.type === "PERCENT") {
    let discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    return { discount: Math.min(discount, subtotal), freeShipping: false };
  }
  if (coupon.type === "FIXED") {
    return { discount: Math.min(coupon.value, subtotal), freeShipping: false };
  }
  return { discount: 0, freeShipping: true };
}

export function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
