import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "Editar produto",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true } },
        variations: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, stock: true, imageUrl: true, active: true },
        },
        quantityPrices: {
          orderBy: { minQuantity: "asc" },
          select: { minQuantity: true, discountPercent: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      productId={product.id}
      categories={categories}
      brands={brands}
      initial={{
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        brandId: product.brand?.id ?? null,
        categoryId: product.category?.id ?? null,
        price: Number(product.price.toString()),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice.toString()) : null,
        costPrice: product.costPrice ? Number(product.costPrice.toString()) : null,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        status: product.status,
        visibility: product.visibility,
        isFeatured: product.isFeatured,
        freeShipping: product.freeShipping,
        weight: product.weight ? Number(product.weight.toString()) : null,
        height: product.height ? Number(product.height.toString()) : null,
        width: product.width ? Number(product.width.toString()) : null,
        length: product.length ? Number(product.length.toString()) : null,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        tags: product.tags,
        images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
        variations: product.variations.map((v) => ({
          name: v.name,
          sku: v.sku,
          price: v.price ? Number(v.price.toString()) : null,
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.toString()) : null,
          stock: v.stock,
          imageUrl: v.imageUrl,
          active: v.active,
        })),
        quantityPrices: product.quantityPrices.map((t) => ({
          minQuantity: t.minQuantity,
          discountPercent: Number(t.discountPercent.toString()),
        })),
      }}
    />
  );
}
