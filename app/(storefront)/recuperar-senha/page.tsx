import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Envie um link para redefinir sua senha.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar senha">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
