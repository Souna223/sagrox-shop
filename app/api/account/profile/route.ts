import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { profileSchema, passwordChangeSchema } from "@/lib/validators";
import { requireAuth, fail, ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        gender: true,
        newsletter: true,
        isVip: true,
        createdAt: true,
      },
    });
    if (!data) return fail("Usuário não encontrado.", 404);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as unknown;
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name.trim(),
        phone: data.phone ?? null,
        cpf: data.cpf ?? null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        newsletter: data.newsletter,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        birthDate: true,
        gender: true,
        newsletter: true,
      },
    });

    if (data.newsletter) {
      await prisma.subscriber.upsert({
        where: { email: updated.email },
        update: { name: data.name.trim(), status: "ACTIVE" },
        create: { email: updated.email, name: data.name.trim(), status: "ACTIVE" },
      });
    }

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as unknown;
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!current?.passwordHash) {
      return fail("Sua conta usa login social. Defina uma senha por outro meio.", 400);
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, current.passwordHash);
    if (!valid) {
      return fail("Senha atual incorreta.", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return ok({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    return handleError(error);
  }
}
