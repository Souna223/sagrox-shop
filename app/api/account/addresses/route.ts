import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validators";
import { requireAuth, fail, ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireAuth();
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return ok(addresses);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as unknown;
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const count = await prisma.address.count({ where: { userId: user.id } });

    const makeDefault = data.isDefault ?? count === 0;

    if (makeDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
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

    return ok(address, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
