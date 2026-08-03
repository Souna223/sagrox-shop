import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { sendPasswordResetEmail, buildResetPasswordUrl } from "@/lib/mail";

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
      await sendPasswordResetEmail({ to: email, name: user.name ?? email, resetUrl });
    }

    return ok({ message: "Se o e-mail existir, enviaremos um link de redefinição." });
  } catch (error) {
    console.error("[forgot-password]", error);
    return fail("Erro ao processar a solicitação. Tente novamente.", 500);
  }
}
