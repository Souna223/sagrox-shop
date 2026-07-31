import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";

const schema = z.object({
  token: z.string().min(20, "Link de redefinição inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`reset:${ip}`, 5, 900)) {
      return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
    }

    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const { token, password } = parsed.data;

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      return fail("Link inválido ou expirado. Solicite uma nova redefinição.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
    });
    if (!user) {
      return fail("Conta não encontrada.", 404);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: { token },
      }),
    ]);

    return ok({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error("[reset-password]", error);
    return fail("Erro ao redefinir a senha. Tente novamente.", 500);
  }
}
