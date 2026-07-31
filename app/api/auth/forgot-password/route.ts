import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { sendEmail, buildResetPasswordUrl } from "@/lib/mail";
import { SITE_NAME } from "@/lib/constants";

const schema = z.object({ email: z.string().email("E-mail inválido.") });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`forgot:${ip}`, 5, 900)) {
      return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
    }

    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.passwordHash) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: { identifier: email, token, expires: expiresAt },
      });

      const resetUrl = buildResetPasswordUrl(token);
      await sendEmail({
        to: email,
        subject: `Redefinição de senha — ${SITE_NAME}`,
        html: `
          <p>Olá, ${user.name}!</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p><a href="${resetUrl}">Clique aqui para redefinir sua senha</a></p>
          <p>O link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
        `,
      });
    }

    return ok({ message: "Se o e-mail existir, enviaremos um link de redefinição." });
  } catch (error) {
    console.error("[forgot-password]", error);
    return fail("Erro ao processar a solicitação. Tente novamente.", 500);
  }
}
