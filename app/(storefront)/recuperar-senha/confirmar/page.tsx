import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.resetPasswordTitle,
    description: t.pages.resetPasswordDescription,
  };
}

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const t = await getDictionary();

  return (
    <AuthShell
      title={t.auth.resetPasswordTitle}
      description={t.auth.resetPasswordDescription}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.auth.invalidResetLink}{" "}
          <a href="/recuperar-senha" className="font-medium text-primary hover:underline">
            {t.auth.requestNewLink}
          </a>
          .
        </p>
      )}
    </AuthShell>
  );
}
