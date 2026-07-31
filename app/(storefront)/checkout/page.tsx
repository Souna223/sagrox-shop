import type { Metadata } from "next";
import { getSessionUser } from "@/lib/api";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.checkoutTitle,
    description: t.pages.checkoutDescription,
  };
}

export default async function CheckoutPage() {
  const user = await getSessionUser();

  return (
    <CheckoutForm
      user={user ? { id: user.id, name: user.name, email: user.email } : null}
    />
  );
}
