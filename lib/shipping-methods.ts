import { prisma } from "@/lib/prisma";

export type ShippingMethodConfig = {
  code: string;
  service: string;
  price: number;
  deliveryDays: number;
  active: boolean;
};

const SETTING_KEY = "shippingMethods";

export const DEFAULT_SHIPPING_METHODS: ShippingMethodConfig[] = [
  { code: "PAC", service: "PAC - Econômico", price: 19.9, deliveryDays: 10, active: true },
  { code: "SEDEX", service: "SEDEX - Expresso", price: 39.9, deliveryDays: 5, active: true },
];

export async function getShippingMethods(): Promise<ShippingMethodConfig[]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row?.value) return DEFAULT_SHIPPING_METHODS;
    const parsed = JSON.parse(row.value as string);
    if (!Array.isArray(parsed)) return DEFAULT_SHIPPING_METHODS;
    return parsed as ShippingMethodConfig[];
  } catch {
    return DEFAULT_SHIPPING_METHODS;
  }
}

export async function saveShippingMethods(methods: ShippingMethodConfig[]): Promise<void> {
  const safe = methods.map((m) => ({
    code: String(m.code || "").trim().toUpperCase().replace(/\s+/g, "_"),
    service: String(m.service || "").trim(),
    price: Number(m.price) || 0,
    deliveryDays: Math.max(1, Math.round(Number(m.deliveryDays) || 1)),
    active: Boolean(m.active),
  }));
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(safe) },
    create: { key: SETTING_KEY, value: JSON.stringify(safe) },
  });
}
