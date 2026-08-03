import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { sendWelcomeEmail } from "@/lib/mail";

const ipKey = (ip: string) => `register:${ip}`;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ipKey(ip), 5, 60)) {
      return fail("Muitas tentativas. Aguarde um minuto.", 429);
    }

    const body = (await request.json()) as unknown;
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail("Este e-mail já está cadastrado.", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        phone: data.phone ?? null,
        cpf: data.cpf ?? null,
        newsletter: data.newsletter ?? false,
      },
      select: { id: true, name: true, email: true },
    });

    if (data.newsletter) {
      await prisma.subscriber.upsert({
        where: { email },
        update: { name: data.name.trim(), status: "ACTIVE" },
        create: { email, name: data.name.trim(), status: "ACTIVE" },
      });
    }

    void sendWelcomeEmail({ to: email, name: user.name ?? email });

    return ok(user, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao criar conta. Tente novamente." },
      { status: 500 },
    );
  }
}
