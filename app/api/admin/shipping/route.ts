import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { getShippingMethods, saveShippingMethods, type ShippingMethodConfig } from "@/lib/shipping-methods";

const methodSchema = z.object({
  code: z.string().min(1, "Informe o código do método."),
  service: z.string().min(1, "Informe o nome do método."),
  price: z.coerce.number().min(0, "Preço inválido."),
  deliveryDays: z.coerce.number().int().min(1, "Prazo inválido."),
  active: z.boolean().default(true),
});

const bodySchema = z.object({
  methods: z.array(methodSchema).min(0),
  shippingEnabled: z.boolean().optional(),
  freeShippingThreshold: z.coerce.number().min(0).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const [methods, settings] = await Promise.all([
      getShippingMethods(),
      prisma.setting.findMany({ where: { key: { in: ["shippingEnabled", "freeShippingThreshold"] } } }),
    ]);
    const map = Object.fromEntries(settings.map((r) => [r.key, r.value as never]));
    return ok({
      methods,
      shippingEnabled: map.shippingEnabled === "true" || map.shippingEnabled === true,
      freeShippingThreshold: Number(map.freeShippingThreshold ?? 299),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const { methods, shippingEnabled, freeShippingThreshold } = parsed.data;
    await saveShippingMethods(methods as ShippingMethodConfig[]);

    if (shippingEnabled !== undefined) {
      await prisma.setting.upsert({
        where: { key: "shippingEnabled" },
        update: { value: String(shippingEnabled) },
        create: { key: "shippingEnabled", value: String(shippingEnabled) },
      });
    }
    if (freeShippingThreshold !== undefined) {
      await prisma.setting.upsert({
        where: { key: "freeShippingThreshold" },
        update: { value: String(freeShippingThreshold) },
        create: { key: "freeShippingThreshold", value: String(freeShippingThreshold) },
      });
    }

    await auditLog({
      userId: admin.id,
      action: "FRETE.ATUALIZADO",
      entityType: "setting",
      details: { methods: methods.length },
    });

    return ok({ methods: methods as ShippingMethodConfig[] });
  } catch (error) {
    return handleError(error, "Erro ao salvar as configurações de frete.");
  }
}
