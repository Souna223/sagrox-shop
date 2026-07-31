import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.loginTitle,
    description: t.pages.loginDescription,
  };
}

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { callbackUrl, error } = await searchParams;
  const user = await getSessionUser();
  const t = await getDictionary();

  if (user) {
    const target = callbackUrl?.startsWith("/") ? callbackUrl : "/conta";
    redirect(target);
  }

  return (
    <AuthShell title={t.auth.loginTitle} description={t.auth.loginDescription}>
      <LoginForm callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : "/conta"} error={error} />
    </AuthShell>
  );
}
