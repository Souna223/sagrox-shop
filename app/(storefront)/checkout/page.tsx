import type { Metadata } from "next";
import { getSessionUser } from "@/lib/api";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description: "Finalize sua compra com segurança. Pagamento via Pix, cartão de crédito ou boleto.",
};

export default async function CheckoutPage() {
  const user = await getSessionUser();

  return (
    <CheckoutForm
      user={user ? { id: user.id, name: user.name, email: user.email } : null}
    />
  );
}
