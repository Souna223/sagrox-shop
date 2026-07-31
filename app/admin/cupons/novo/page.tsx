import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupon-form";

export const metadata: Metadata = {
  title: "Novo cupom",
};

export default function NewCouponPage() {
  return <CouponForm />;
}
