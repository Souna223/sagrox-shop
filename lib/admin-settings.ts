import { z } from "zod";

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Informe o nome da loja.").max(80, "Nome muito longo."),
  storeDescription: z.string().trim().max(300, "Descrição muito longa."),
  currency: z.string().trim().min(1).max(10, "Moeda inválida.").default("BRL"),
  whatsapp: z.string().trim().max(30, "WhatsApp inválido.").optional(),
  phone: z.string().trim().max(30, "Telefone inválido.").optional(),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200, "Endereço muito longo.").optional(),
  instagram: z.string().trim().max(100, "Usuário do Instagram muito longo.").optional(),
  facebook: z.string().trim().max(100, "URL do Facebook muito longa.").optional(),
  tiktok: z.string().trim().max(100, "Usuário do TikTok muito longo.").optional(),
  businessHours: z.string().trim().max(200, "Horário de funcionamento muito longo.").optional(),
  freeShippingThreshold: z.coerce.number().min(0, "Valor inválido.").default(0),
  shippingEnabled: z.boolean().default(true),
  appmaxPublicKey: z.string().trim().max(300, "Chave muito longa.").optional(),
  announcement: z.string().trim().max(300, "Anúncio muito longo.").optional(),
  theme: z.enum(["light", "dark"]).default("light"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const SETTING_KEYS: (keyof SettingsInput)[] = [
  "storeName",
  "storeDescription",
  "currency",
  "whatsapp",
  "phone",
  "email",
  "address",
  "instagram",
  "facebook",
  "tiktok",
  "businessHours",
  "freeShippingThreshold",
  "shippingEnabled",
  "appmaxPublicKey",
  "announcement",
  "theme",
];

export type SettingValues = Record<string, string | number | boolean>;
