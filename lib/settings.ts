import { prisma } from "@/lib/prisma";

export type SiteSettings = {
  storeName: string;
  storeDescription: string;
  currency: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  businessHours: string;
  freeShippingThreshold: number;
  shippingEnabled: boolean;
  appmaxPublicKey: string;
  announcement: string;
  theme: string;
};

const DEFAULTS: SiteSettings = {
  storeName: "wbsite",
  storeDescription: "Sua loja de e-commerce",
  currency: "BRL",
  whatsapp: "",
  phone: "",
  email: "",
  address: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  businessHours: "",
  freeShippingThreshold: 299,
  shippingEnabled: true,
  appmaxPublicKey: "",
  announcement: "",
  theme: "light",
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.setting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const shippingEnabled =
      map.shippingEnabled === undefined
        ? DEFAULTS.shippingEnabled
        : map.shippingEnabled === true || map.shippingEnabled === "true";
    return {
      ...DEFAULTS,
      ...map,
      freeShippingThreshold: Number(map.freeShippingThreshold ?? DEFAULTS.freeShippingThreshold),
      shippingEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getStoreName(): Promise<string> {
  const settings = await getSettings();
  return settings.storeName || "wbsite";
}
