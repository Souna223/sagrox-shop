import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validators";
import { requireAuth, fail, ok, handleError } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

async function getOwnedAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({
    where: { id, userId },
  });
  if (!address) throw new Error("Endereço não encontrado.");
  return address;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    await getOwnedAddress(user.id, id);

    const body = (await request.json()) as unknown;
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const count = await prisma.address.count({ where: { userId: user.id } });
    const makeDefault = data.isDefault ?? count === 1;

    if (makeDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        label: data.label || "Principal",
        zip: data.zip,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        isDefault: makeDefault,
      },
    });

    return ok(address);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const address = await getOwnedAddress(user.id, id);

    const wasDefault = address.isDefault;
    await prisma.address.delete({ where: { id } });

    if (wasDefault) {
      const next = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return ok({ message: "Endereço removido." });
  } catch (error) {
    return handleError(error);
  }
}
