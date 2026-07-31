import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.registerTitle,
    description: t.pages.registerDescription,
  };
}

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/conta");

  const t = await getDictionary();

  return (
    <AuthShell
      title={t.auth.registerTitle}
      description={t.auth.registerDescription}
    >
      <RegisterForm />
    </AuthShell>
  );
}
