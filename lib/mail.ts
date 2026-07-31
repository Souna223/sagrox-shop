import { SITE_NAME, SITE_URL } from "@/lib/constants";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const from = `${SITE_NAME} <${process.env.SMTP_FROM ?? "nao-responder@wbsite.com.br"}>`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    throw new Error(
      "Configuração SMTP presente, mas o provedor de e-mail ainda não foi instalado (nodemailer).",
    );
  }

  console.log(`[mail:dev] De: ${from} | Para: ${message.to} | Assunto: ${message.subject}`);
  console.log(`[mail:dev] HTML: ${message.html.slice(0, 500)}`);
}

export function buildResetPasswordUrl(token: string): string {
  return `${SITE_URL}/recuperar-senha/confirmar?token=${token}`;
}
