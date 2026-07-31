// Seed de produção: cria/atualiza SOMENTE o administrador e as configurações padrão.
// Não cria dados de demonstração (catálogo, cupons, FAQs etc.).
// Uso: npm run db:seed:admin  (exige ADMIN_EMAIL e ADMIN_PASSWORD no ambiente)
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const defaultSettings: Record<string, unknown> = {
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
  businessHours: "Segunda a sexta, das 9h às 18h",
  freeShippingThreshold: 299,
  shippingEnabled: true,
  appmaxPublicKey: process.env.APPMax_PUBLIC_KEY ?? "",
  announcement: "",
  theme: "light",
};

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@wbsite.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD é obrigatório (mínimo de 8 caracteres) para criar/atualizar o administrador.",
    );
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      isActive: true,
      referralCode: "ADMIN",
    },
  });
  console.log(`✅ Administrador garantido: ${adminEmail}`);

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }
  console.log("✅ Configurações padrão garantidas");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
