import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { round } from "@/lib/prices";
import { serializeRecord } from "@/lib/serialize";
import type { Prisma, ProductStatus } from "@/generated/prisma/client";

export type KitComponent = {
  productId: string;
  variationId: string | null;
  name: string;
  sku: string;
  unitPrice: number;
  stock: number;
  quantity: number;
  imageUrl: string | null;
  weightGrams: number;
};

export type ResolvedKit = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  image: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  basePrice: number;
  unitPrice: number;
  compareAtPrice: number | null;
  discountPercent: number;
  maxQuantity: number;
  weightGrams: number;
  components: KitComponent[];
};

type KitItemWithProduct = Prisma.KitItemGetPayload<{
  include: {
    product: { select: { id: true; name: true; sku: true; price: true; stock: true; weight: true; images: { where: { isMain: true }; take: 1; select: { url: true } } } };
    variation: { select: { id: true; name: true; sku: true; price: true; stock: true; imageUrl: true } };
  };
}>;

export function serializeKit(kit: Record<string, unknown>) {
  return serializeRecord(kit);
}

export async function ensureUniqueKitSlug(slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let i = 1;
  while (true) {
    const existing = await prisma.kit.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

type KitPayload = {
  name: string;
  slug?: string;
  sku: string;
  description?: string;
  image?: string;
  price?: number | null;
  discountPercent?: number | null;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
  items: { productId: string; variationId?: string | null; quantity: number }[];
};

export async function applyKitPayload(payload: KitPayload, kitId?: string) {
  const slug = payload.slug?.trim()
    ? slugify(payload.slug)
    : await ensureUniqueKitSlug(slugify(payload.name));
  const finalSlug = await ensureUniqueKitSlug(slug, kitId);

  const data = {
    name: payload.name.trim(),
    slug: finalSlug,
    sku: payload.sku.trim(),
    description: payload.description?.trim() || null,
    image: payload.image?.trim() || null,
    price: payload.price ?? null,
    discountPercent: payload.discountPercent ?? null,
    status: (payload.status ?? "DRAFT") as ProductStatus,
    seoTitle: payload.seoTitle?.trim() || null,
    seoDescription: payload.seoDescription?.trim() || null,
  };

  const items = payload.items.map((item) => ({
    productId: item.productId,
    variationId: item.variationId ?? null,
    quantity: Math.max(1, item.quantity),
  }));

  return prisma.$transaction(async (tx) => {
    const saved = kitId
      ? await tx.kit.update({ where: { id: kitId }, data })
      : await tx.kit.create({ data });

    await tx.kitItem.deleteMany({ where: { kitId: saved.id } });
    if (items.length > 0) {
      await tx.kitItem.createMany({ data: items.map((item) => ({ ...item, kitId: saved.id })) });
    }

    return saved;
  });
}

function componentFromRow(row: KitItemWithProduct): KitComponent {
  const product = row.product;
  const variation = row.variation;
  const unitPrice = variation?.price != null ? Number(variation.price) : Number(product.price);
  const stock = variation ? variation.stock : product.stock;
  return {
    productId: product.id,
    variationId: variation?.id ?? null,
    name: variation ? `${product.name} — ${variation.name}` : product.name,
    sku: variation?.sku ?? product.sku,
    unitPrice,
    stock,
    quantity: Math.max(1, row.quantity),
    imageUrl: variation?.imageUrl ?? product.images[0]?.url ?? null,
    weightGrams: product.weight ? Math.round(Number(product.weight) * 1000) : 0,
  };
}

export function resolveKit(
  kit: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string | null;
    image: string | null;
    price: Prisma.Decimal | number | null;
    discountPercent: Prisma.Decimal | number | null;
    status: string;
    seoTitle: string | null;
    seoDescription: string | null;
    items: KitItemWithProduct[];
  },
): ResolvedKit {
  const components = kit.items.map(componentFromRow);

  const basePrice = round(components.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0));

  const fixedPrice = kit.price != null ? Number(kit.price) : null;
  const discountPct = kit.discountPercent != null ? Number(kit.discountPercent) : null;

  let unitPrice: number;
  let compareAtPrice: number | null;

  if (fixedPrice != null) {
    unitPrice = round(fixedPrice);
    compareAtPrice = basePrice > unitPrice ? basePrice : null;
  } else if (discountPct != null && discountPct > 0) {
    unitPrice = round(basePrice * (1 - discountPct / 100));
    compareAtPrice = basePrice;
  } else {
    unitPrice = basePrice;
    compareAtPrice = null;
  }

  const maxQuantity =
    components.length === 0
      ? 0
      : Math.floor(
          Math.min(...components.map((c) => Math.floor(c.stock / c.quantity))),
        );

  const weightGrams = components.reduce((sum, c) => sum + c.weightGrams * c.quantity, 0);

  return {
    id: kit.id,
    name: kit.name,
    slug: kit.slug,
    sku: kit.sku,
    description: kit.description,
    image: kit.image,
    status: kit.status,
    seoTitle: kit.seoTitle,
    seoDescription: kit.seoDescription,
    basePrice,
    unitPrice,
    compareAtPrice,
    discountPercent:
      compareAtPrice && compareAtPrice > unitPrice && unitPrice > 0
        ? Math.round(((compareAtPrice - unitPrice) / compareAtPrice) * 100)
        : 0,
    maxQuantity,
    weightGrams,
    components,
  };
}

const kitWithItems = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  image: true,
  price: true,
  discountPercent: true,
  status: true,
  seoTitle: true,
  seoDescription: true,
  items: {
    orderBy: { id: "asc" as const },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
          weight: true,
          images: { where: { isMain: true }, take: 1, select: { url: true } },
        },
      },
      variation: {
        select: { id: true, name: true, sku: true, price: true, stock: true, imageUrl: true },
      },
    },
  },
};

export async function getActiveKits() {
  const kits = await prisma.kit.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: kitWithItems,
  });
  return kits.map(resolveKit);
}

export async function getActiveKitBySlug(slug: string) {
  const kit = await prisma.kit.findFirst({
    where: { slug, status: "ACTIVE" },
    select: kitWithItems,
  });
  return kit ? resolveKit(kit) : null;
}

export async function incrementKitView(id: string) {
  await prisma.kit.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
}
