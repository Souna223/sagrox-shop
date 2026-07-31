import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CartPage } from "@/components/storefront/cart-page";

export const metadata: Metadata = {
  title: "Carrinho de compras",
  description: "Revise os produtos do seu carrinho e finalize sua compra com segurança.",
};

export default async function CartPageRoute() {
  const settings = await getSettings();
  return <CartPage freeShippingThreshold={settings.freeShippingThreshold} />;
}
