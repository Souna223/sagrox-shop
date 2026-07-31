import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CartPage } from "@/components/storefront/cart-page";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.cartTitle,
    description: t.pages.cartDescription,
  };
}

export default async function CartPageRoute() {
  const settings = await getSettings();
  return <CartPage freeShippingThreshold={settings.freeShippingThreshold} />;
}
