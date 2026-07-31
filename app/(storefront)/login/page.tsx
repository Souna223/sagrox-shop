import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta para acompanhar pedidos, endereços e muito mais.",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { callbackUrl, error } = await searchParams;
  const user = await getSessionUser();

  if (user) {
    const target = callbackUrl?.startsWith("/") ? callbackUrl : "/conta";
    redirect(target);
  }

  return (
    <AuthShell title="Entrar na sua conta" description="Acompanhe seus pedidos e aproveite ofertas exclusivas.">
      <LoginForm callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : "/conta"} error={error} />
    </AuthShell>
  );
}
