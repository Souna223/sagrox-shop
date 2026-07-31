import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Defina uma nova senha para sua conta.",
};

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Redefinir senha"
      description="Defina uma nova senha para acessar sua conta."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Link de redefinição inválido.{" "}
          <a href="/recuperar-senha" className="font-medium text-primary hover:underline">
            Solicite um novo link
          </a>
          .
        </p>
      )}
    </AuthShell>
  );
}
