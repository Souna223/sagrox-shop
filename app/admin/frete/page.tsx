import type { Metadata } from "next";
import { requireAdmin } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getShippingMethods } from "@/lib/shipping-methods";
import { ShippingForm } from "@/components/admin/shipping-form";

export const metadata: Metadata = {
  title: "Frete",
};

export default async function AdminShippingPage() {
  await requireAdmin();

  const [methods, settings] = await Promise.all([getShippingMethods(), getSettings()]);

  return (
    <ShippingForm
      methods={methods}
      shippingEnabled={settings.shippingEnabled}
      freeShippingThreshold={settings.freeShippingThreshold}
    />
  );
}
