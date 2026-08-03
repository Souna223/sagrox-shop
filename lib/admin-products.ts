import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { serializeRecord } from "@/lib/serialize";
import type { ProductStatus, ProductVisibility } from "@/generated/prisma/enums";
import type { z } from "zod";
import type { productSchema } from "@/lib/validators";

type ProductInput = z.infer<typeof productSchema>;

export function serializeAdminProduct(product: Record<string, unknown>) {
  return serializeRecord(product);
}

export async function ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let i = 1;
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

export async function applyProductPayload(payload: ProductInput, productId?: string) {
  const slug = payload.slug?.trim()
    ? slugify(payload.slug)
    : await ensureUniqueSlug(slugify(payload.name));
  const finalSlug = await ensureUniqueSlug(slug, productId);

  const data = {
    name: payload.name.trim(),
    slug: finalSlug,
    shortDescription: payload.shortDescription?.trim() || null,
    description: payload.description?.trim() || null,
    sku: payload.sku.trim(),
    barcode: payload.barcode?.trim() || null,
    brandId: payload.brandId?.trim() ? payload.brandId : null,
    categoryId: payload.categoryId?.trim() ? payload.categoryId : null,
    price: payload.price,
    compareAtPrice: payload.compareAtPrice ?? null,
    costPrice: payload.costPrice ?? null,
    stock: payload.stock,
    lowStockThreshold: payload.lowStockThreshold,
    status: payload.status as ProductStatus,
    visibility: payload.visibility as ProductVisibility,
    isFeatured: payload.isFeatured,
    isBestSeller: payload.isBestSeller,
    isNew: payload.isNew,
    weight: payload.weight ?? null,
    height: payload.height ?? null,
    width: payload.width ?? null,
    length: payload.length ?? null,
    freeShipping: payload.freeShipping,
    seoTitle: payload.seoTitle?.trim() || null,
    seoDescription: payload.seoDescription?.trim() || null,
    attributes: (payload.attributes ?? null) as never,
    tags: payload.tags ?? [],
  };

  const images =
    payload.images.map((url, index) => ({
      url,
      alt: payload.name.trim(),
      sortOrder: index,
      isMain: index === 0,
    })) ?? [];

  const variations =
    payload.variations.map((v) => ({
      name: v.name,
      sku: v.sku,
      price: v.price ?? null,
      compareAtPrice: v.compareAtPrice ?? null,
      costPrice: null,
      stock: v.stock,
      imageUrl: v.imageUrl ?? null,
      attributes: (v.attributes ?? null) as never,
      active: v.active,
    })) ?? [];

  const product = await prisma.$transaction(async (tx) => {
    const saved = productId
      ? await tx.product.update({
          where: { id: productId },
          data,
        })
      : await tx.product.create({
          data,
        });

    await tx.productImage.deleteMany({ where: { productId: saved.id } });
    await tx.productImage.createMany({ data: images.map((img) => ({ ...img, productId: saved.id })) });

    await tx.productVariation.deleteMany({ where: { productId: saved.id } });
    await tx.productVariation.createMany({ data: variations.map((v) => ({ ...v, productId: saved.id })) });

    return saved;
  });

  return product;
}
