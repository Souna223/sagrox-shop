import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta e aproveite compras com entrega em todo o Brasil.",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/conta");

  return (
    <AuthShell
      title="Criar conta"
      description="Preencha seus dados para começar a comprar."
    >
      <RegisterForm />
    </AuthShell>
  );
}
