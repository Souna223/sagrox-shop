import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("🌱 Iniciando seed...");

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@wbsite.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123456";

  const admin = await prisma.user.upsert({
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
  console.log(`✅ Admin criado: ${admin.email}`);

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
    freeShippingThreshold: 0,
    shippingEnabled: true,
    appmaxPublicKey: process.env.APPMax_PUBLIC_KEY ?? "",
    announcement: "",
    theme: "light",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }
  console.log("✅ Configurações padrão criadas");

  const faqs = [
    {
      question: "Quais são as formas de pagamento?",
      answer:
        "Aceitamos Pix, cartão de crédito em até 12x, cartão de débito e boleto bancário. Todos os pagamentos são processados de forma segura pela Appmax.",
    },
    {
      question: "Qual é o prazo de entrega?",
      answer:
        "O prazo de entrega varia de acordo com a região e a modalidade escolhida. Após a confirmação do pagamento, o pedido é despachado em até 24h úteis.",
    },
    {
      question: "Como acompanho meu pedido?",
      answer:
        "Assim que o pedido for enviado, você receberá um código de rastreio por e-mail e também poderá acompanhar na sua conta.",
    },
    {
      question: "Posso trocar ou devolver um produto?",
      answer:
        "Sim. Você tem até 7 dias após o recebimento para solicitar a troca ou devolução, conforme o Código de Defesa do Consumidor.",
    },
    {
      question: "Meus dados estão seguros?",
      answer:
        "Sim. Utilizamos criptografia SSL e seguimos a Lei Geral de Proteção de Dados (LGPD). Seus dados nunca são compartilhados sem autorização.",
    },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: { id: `seed-faq-${faq.question}` },
      update: {},
      create: { id: `seed-faq-${faq.question}`, question: faq.question, answer: faq.answer },
    });
  }
  console.log("✅ FAQs criadas");

  await seedCatalog();

  const coupons = [
    {
      id: "seed-coupon-10",
      code: "CUPOM10",
      name: "10% de desconto",
      type: "PERCENT" as const,
      value: 10,
      maxDiscount: 50,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    },
    {
      id: "seed-coupon-frete",
      code: "FRETEGRATIS",
      name: "Frete grátis",
      type: "FREE_SHIPPING" as const,
      value: 0,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, active: true },
    });
  }
  console.log("✅ Cupons criados");

  console.log("🎉 Seed concluído com sucesso!");
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

const CATEGORIES: { id: string; name: string; slug: string; parent?: string; sortOrder: number; description?: string }[] = [
  { id: "seed-cat-eletronicos", name: "Eletrônicos", slug: "eletronicos", sortOrder: 1, description: "Celulares, acessórios e dispositivos eletrônicos com os melhores preços." },
  { id: "seed-cat-celulares", name: "Celulares", slug: "celulares", parent: "seed-cat-eletronicos", sortOrder: 1 },
  { id: "seed-cat-fones", name: "Fones e Áudio", slug: "fones-e-audio", parent: "seed-cat-eletronicos", sortOrder: 2 },
  { id: "seed-cat-moda", name: "Moda", slug: "moda", sortOrder: 2, description: "Roupas, calçados e acessórios para todos os estilos." },
  { id: "seed-cat-masculino", name: "Masculino", slug: "masculino", parent: "seed-cat-moda", sortOrder: 1 },
  { id: "seed-cat-casa", name: "Casa e Decoração", slug: "casa-e-decoracao", sortOrder: 3 },
  { id: "seed-cat-beleza", name: "Beleza", slug: "beleza", sortOrder: 4 },
  { id: "seed-cat-esportes", name: "Esportes", slug: "esportes", sortOrder: 5 },
];

const BRANDS = [
  { id: "seed-brand-a", name: "Norte Tech", slug: "norte-tech" },
  { id: "seed-brand-b", name: "Atlas Home", slug: "atlas-home" },
  { id: "seed-brand-c", name: "VivaBeleza", slug: "vivabeleza" },
];

type SeedProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  brandId: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  shortDescription: string;
  description: string;
  isFeatured?: boolean;
  freeShipping?: boolean;
  tags: string[];
  images: string[];
  variations?: { name: string; sku: string; price?: number; stock: number }[];
  attributes?: Record<string, string>;
  ratingAvg?: number;
  ratingCount?: number;
};

const PRODUCTS: SeedProduct[] = [
  {
    id: "seed-prod-1",
    name: "Smartphone Zephyr 5G 128GB",
    slug: "smartphone-zephyr-5g-128gb",
    sku: "ZEPH-5G-128",
    categorySlug: "celulares",
    brandId: "seed-brand-a",
    price: 1899.9,
    compareAtPrice: 2399.9,
    stock: 25,
    shortDescription: "Tela AMOLED 6.5\", câmera tripla de 50MP e bateria para o dia todo.",
    description: "Conheça o Smartphone Zephyr 5G. Tela AMOLED de 6.5 polegadas com 120Hz, câmera tripla de 50MP, 8GB de RAM e 128GB de armazenamento. Bateria de 5000mAh com carregamento rápido de 33W.",
    isFeatured: true,
    freeShipping: true,
    tags: ["smartphone", "5g", "celular"],
    images: [img("zephyr"), img("zephyr-2"), img("zephyr-3")],
    attributes: { Marca: "Norte Tech", "Tela": "6.5\" AMOLED", "Câmera": "50MP tripla", "Bateria": "5000mAh", "Conexão": "5G" },
    ratingAvg: 4.7,
    ratingCount: 132,
  },
  {
    id: "seed-prod-2",
    name: "Fone de Ouvido Bluetooth MaxSound Pro",
    slug: "fone-bluetooth-maxsound-pro",
    sku: "MAXSND-PRO",
    categorySlug: "fones-e-audio",
    brandId: "seed-brand-a",
    price: 349.9,
    compareAtPrice: 499.9,
    stock: 40,
    shortDescription: "Cancelamento ativo de ruído, 40h de bateria e graves potentes.",
    description: "Fone de ouvido Bluetooth com cancelamento ativo de ruído (ANC), até 40 horas de bateria, carregamento rápido via USB-C e microfones com redução de ruído para chamadas claras.",
    isFeatured: true,
    freeShipping: true,
    tags: ["fone", "bluetooth", "audio"],
    images: [img("maxsound"), img("maxsound-2")],
    variations: [
      { name: "Preto", sku: "MAXSND-PRO-BK", stock: 20 },
      { name: "Branco", sku: "MAXSND-PRO-WT", stock: 12 },
      { name: "Azul", sku: "MAXSND-PRO-BL", stock: 8 },
    ],
    attributes: { Marca: "Norte Tech", "Conectividade": "Bluetooth 5.3", "Bateria": "40h", "Cancelamento de ruído": "Ativo" },
    ratingAvg: 4.5,
    ratingCount: 87,
  },
  {
    id: "seed-prod-3",
    name: "Camiseta Básica Algodão Premium",
    slug: "camiseta-basica-algodao-premium",
    sku: "TSHIRT-PREM",
    categorySlug: "masculino",
    brandId: "seed-brand-b",
    price: 59.9,
    compareAtPrice: 79.9,
    stock: 150,
    shortDescription: "Algodão penteado de alta durabilidade, toque macio e caimento perfeito.",
    description: "Camiseta básica confeccionada em algodão penteado fio 30.1, com costuras reforçadas e etiqueta estampada para maior conforto. Modelagem regular fit.",
    freeShipping: false,
    tags: ["camiseta", "moda", "casual"],
    images: [img("camiseta"), img("camiseta-2"), img("camiseta-3")],
    variations: [
      { name: "P", sku: "TSHIRT-PREM-P", stock: 40 },
      { name: "M", sku: "TSHIRT-PREM-M", stock: 50 },
      { name: "G", sku: "TSHIRT-PREM-G", stock: 40 },
      { name: "GG", sku: "TSHIRT-PREM-GG", stock: 20 },
    ],
    attributes: { "Material": "100% algodão penteado", "Tamanhos": "P, M, G, GG", "Cuidados": "Lavar a frio" },
    ratingAvg: 4.3,
    ratingCount: 210,
  },
  {
    id: "seed-prod-4",
    name: "Kit Luminária LED Abajur Inteligente",
    slug: "kit-luminaria-led-abajur-inteligente",
    sku: "LAMP-SMART",
    categorySlug: "casa-e-decoracao",
    brandId: "seed-brand-b",
    price: 189.9,
    compareAtPrice: 259.9,
    stock: 30,
    shortDescription: "Luz regulável com controle por app, 16 milhões de cores e modo de leitura.",
    description: "Luminária LED inteligente com controle por aplicativo, 16 milhões de cores, modos de luz (leitura, relaxamento e festa) e timer. Base em madeira com acabamento premium.",
    isFeatured: true,
    freeShipping: true,
    tags: ["luminaria", "decoracao", "smart"],
    images: [img("lamp"), img("lamp-2"), img("lamp-3")],
    attributes: { Marca: "Atlas Home", "Potência": "9W", "Controle": "App / Alexa / Google", "Cores": "16M" },
    ratingAvg: 4.6,
    ratingCount: 64,
  },
  {
    id: "seed-prod-5",
    name: "Kit Sérum Facial Ácido Hialurônico",
    slug: "kit-serum-facial-acido-hialuronico",
    sku: "SERUM-HIAL",
    categorySlug: "beleza",
    brandId: "seed-brand-c",
    price: 129.9,
    stock: 80,
    shortDescription: "Hidratação profunda, redução de linhas finas e viço imediato.",
    description: "Sérum facial com ácido hialurônico, vitamina C e esqualano. Proporciona hidratação profunda, reduz linhas finas e devolve o viço à pele. Dermatologicamente testado.",
    freeShipping: false,
    tags: ["skincare", "beleza", "serum"],
    images: [img("serum"), img("serum-2")],
    attributes: { Marca: "VivaBeleza", "Volume": "30ml", "Indicado para": "Todos os tipos de pele", "Testado": "Dermatologicamente" },
    ratingAvg: 4.8,
    ratingCount: 95,
  },
  {
    id: "seed-prod-6",
    name: "Tênis Corrida UltraFlex Air",
    slug: "tenis-corrida-ultraflex-air",
    sku: "RUN-ULTRA",
    categorySlug: "esportes",
    brandId: "seed-brand-b",
    price: 299.9,
    compareAtPrice: 389.9,
    stock: 45,
    shortDescription: "Amortecimento responsivo, cabedal respirável e solado antiderrapante.",
    description: "Tênis de corrida com espuma de amortecimento responsivo, cabedal em mesh respirável, solado de borracha antiderrapante e palmilha removível. Ideal para treinos diários e corridas de rua.",
    freeShipping: true,
    tags: ["tenis", "corrida", "esporte"],
    images: [img("tenis"), img("tenis-2"), img("tenis-3")],
    variations: [
      { name: "38", sku: "RUN-ULTRA-38", stock: 10 },
      { name: "39", sku: "RUN-ULTRA-39", stock: 12 },
      { name: "40", sku: "RUN-ULTRA-40", stock: 8 },
      { name: "41", sku: "RUN-ULTRA-41", stock: 15 },
    ],
    attributes: { Marca: "Atlas Home", "Categoria": "Corrida", "Solado": "Borracha antiderrapante" },
    ratingAvg: 4.4,
    ratingCount: 150,
  },
  {
    id: "seed-prod-7",
    name: "Smartwatch Pulse Fit 3",
    slug: "smartwatch-pulse-fit-3",
    sku: "WATCH-FIT3",
    categorySlug: "eletronicos",
    brandId: "seed-brand-a",
    price: 449.9,
    compareAtPrice: 599.9,
    stock: 60,
    shortDescription: "Monitor cardíaco, GPS, 20 modos de treino e bateria de 10 dias.",
    description: "Smartwatch com monitoramento de batimentos cardíacos, GPS integrado, mais de 20 modos de treino, resistência à água 5ATM e bateria com duração de até 10 dias.",
    isFeatured: true,
    freeShipping: true,
    tags: ["smartwatch", "wearable", "saude"],
    images: [img("watch"), img("watch-2")],
    variations: [
      { name: "Preto", sku: "WATCH-FIT3-BK", stock: 30 },
      { name: "Prata", sku: "WATCH-FIT3-SV", stock: 30 },
    ],
    attributes: { Marca: "Norte Tech", "Tela": "1.85\" AMOLED", "Bateria": "10 dias", "Resistência": "5ATM" },
    ratingAvg: 4.5,
    ratingCount: 78,
  },
  {
    id: "seed-prod-8",
    name: "Jogo de Panelas Antiaderente 5 Peças",
    slug: "jogo-panelas-antiaderente-5-pecas",
    sku: "PAN-5PC",
    categorySlug: "casa-e-decoracao",
    brandId: "seed-brand-b",
    price: 379.9,
    stock: 20,
    shortDescription: "Revestimento cerâmico, alças frias e compatível com todas as fontes de calor.",
    description: "Jogo de panelas com revestimento cerâmico antiaderente, alças termo-resistentes e tampas de vidro temperado. Compatível com fogão a gás, indução e forno.",
    freeShipping: true,
    tags: ["cozinha", "panelas", "casa"],
    images: [img("panela"), img("panela-2"), img("panela-3")],
    attributes: { Marca: "Atlas Home", "Peças": "5", "Revestimento": "Cerâmico", "Indução": "Sim" },
    ratingAvg: 4.2,
    ratingCount: 41,
  },
  {
    id: "seed-prod-9",
    name: "Base Facial Matte Effect 24h",
    slug: "base-facial-matte-effect-24h",
    sku: "BASE-MATTE",
    categorySlug: "beleza",
    brandId: "seed-brand-c",
    price: 89.9,
    compareAtPrice: 109.9,
    stock: 0,
    shortDescription: "Cobertura média com efeito matte de longa duração.",
    description: "Base de alta cobertura com acabamento matte e efeito de 24h de duração. Fórmula leve com proteção solar FPS 30 e enriquecida com vitamina E.",
    tags: ["maquiagem", "beleza", "base"],
    images: [img("base"), img("base-2")],
    variations: [
      { name: "Cor Claro", sku: "BASE-MATTE-C1", stock: 0 },
      { name: "Cor Médio", sku: "BASE-MATTE-C2", stock: 0 },
      { name: "Cor Escuro", sku: "BASE-MATTE-C3", stock: 0 },
    ],
    attributes: { Marca: "VivaBeleza", "Volume": "30ml", "Acabamento": "Matte", "FPS": "30" },
    ratingAvg: 4.1,
    ratingCount: 33,
  },
  {
    id: "seed-prod-10",
    name: "Caixa de Som Bluetooth Boom 360",
    slug: "caixa-som-bluetooth-boom-360",
    sku: "BOOM-360",
    categorySlug: "fones-e-audio",
    brandId: "seed-brand-a",
    price: 259.9,
    compareAtPrice: 349.9,
    stock: 55,
    shortDescription: "Som 360°, à prova d'água e bateria de 20 horas.",
    description: "Caixa de som portátil com som 360 graus, classificação IPX7 à prova d'água, bateria de 20 horas e conexão Bluetooth 5.2. Ideal para festas e uso ao ar livre.",
    isFeatured: true,
    freeShipping: true,
    tags: ["caixa de som", "bluetooth", "audio"],
    images: [img("boom"), img("boom-2")],
    variations: [
      { name: "Preto", sku: "BOOM-360-BK", stock: 30 },
      { name: "Vermelho", sku: "BOOM-360-RD", stock: 25 },
    ],
    attributes: { Marca: "Norte Tech", "Potência": "30W", "Bluetooth": "5.2", "Bateria": "20h", "Resistência": "IPX7" },
    ratingAvg: 4.6,
    ratingCount: 120,
  },
];

async function seedCatalog() {
  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    console.log("ℹ️ Catálogo já possui produtos, pulando seed de catálogo.");
    return;
  }

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, slug: cat.slug, active: true, sortOrder: cat.sortOrder, description: cat.description },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        description: cat.description,
        parentId: cat.parent ?? null,
        active: true,
      },
    });
  }

  for (const brand of BRANDS) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {},
      create: { id: brand.id, name: brand.name, slug: brand.slug },
    });
  }

  const categoryBySlug: Record<string, string> = {};
  for (const cat of CATEGORIES) categoryBySlug[cat.slug] = cat.id;

  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryId: categoryBySlug[p.categorySlug],
        brandId: p.brandId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        shortDescription: p.shortDescription,
        description: p.description,
        status: "ACTIVE",
        visibility: "VISIBLE",
        isFeatured: p.isFeatured ?? false,
        freeShipping: p.freeShipping ?? false,
        tags: p.tags,
        attributes: p.attributes ? (p.attributes as object) : undefined,
        ratingAvg: p.ratingAvg ?? 0,
        ratingCount: p.ratingCount ?? 0,
        images: {
          create: p.images.map((url, i) => ({
            url,
            alt: p.name,
            sortOrder: i,
            isMain: i === 0,
          })),
        },
        variations: p.variations
          ? {
              create: p.variations.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price ?? p.price,
                stock: v.stock,
              })),
            }
          : undefined,
      },
    });

    if (p.id === "seed-prod-1") {
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
      if (admin) {
        await prisma.review.createMany({
          data: [
            { productId: p.id, userId: admin.id, rating: 5, title: "Excelente!", comment: "Câmera incrível e bateria dura o dia todo. Recomendo demais!", status: "APPROVED" },
            { productId: p.id, userId: admin.id, orderId: "seed-order-review-1", rating: 4, title: "Muito bom", comment: "Ótimo custo-benefício. Entrega rápida.", status: "APPROVED" },
          ],
        });
      }
    }
  }

  const flashSale = await prisma.flashSale.upsert({
    where: { id: "seed-flash-1" },
    update: {},
    create: {
      id: "seed-flash-1",
      title: "Ofertas da Semana",
      slug: "ofertas-da-semana",
      discountType: "PERCENT",
      discountValue: 10,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 7 * 86_400_000),
      active: true,
    },
  });

  for (const productId of ["seed-prod-1", "seed-prod-2", "seed-prod-10"]) {
    await prisma.flashSaleProduct.upsert({
      where: { flashSaleId_productId: { flashSaleId: flashSale.id, productId } },
      update: {},
      create: { flashSaleId: flashSale.id, productId },
    });
  }

  console.log("✅ Catálogo de demonstração criado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });