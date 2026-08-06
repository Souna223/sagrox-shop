import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  isFeatured: true,
  freeShipping: true,
  ratingAvg: true,
  ratingCount: true,
  salesCount: true,
  status: true,
  visibility: true,
  images: {
    where: { isMain: true },
    take: 1,
    orderBy: { sortOrder: "asc" as const },
  },
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  stock: number;
  isFeatured: boolean;
  freeShipping: boolean;
  ratingAvg: { toString(): string };
  ratingCount: number;
  salesCount: number;
  status: string;
  visibility: string;
  images: { url: string; alt: string | null }[];
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
};

export function serializeProduct<T extends Record<string, unknown>>(product: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(product)) {
    if (value && typeof value === "object" && "toString" in value && typeof (value as { toString(): string }).toString === "function") {
      const proto = Object.getPrototypeOf(value)?.constructor?.name ?? "";
      if (proto === "Decimal") {
        result[key] = Number(value.toString());
        continue;
      }
    }
    result[key] = value;
  }
  return result as T;
}

export type PublicProductListParams = {
  category?: string;
  brand?: string;
  q?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest" | "bestseller";
  page?: number;
  perPage?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  tags?: string[];
  featured?: boolean;
  inStockOnly?: boolean;
  onSale?: boolean;
  freeShipping?: boolean;
};

export async function getPublicProducts(params: PublicProductListParams = {}) {
  const {
    category,
    brand,
    q,
    sort = "relevance",
    page = 1,
    perPage = 24,
    minPrice,
    maxPrice,
    minRating,
    tags,
    featured,
    inStockOnly,
    onSale,
    freeShipping,
  } = params;

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    visibility: "VISIBLE",
  };

  if (category) {
    where.category = { OR: [{ slug: category }, { parent: { slug: category } }] };
  }
  if (brand) where.brand = { slug: brand };
  if (featured) where.isFeatured = true;
  if (inStockOnly) where.stock = { gt: 0 };
  if (minRating) where.ratingAvg = { gte: minRating };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      gte: minPrice !== undefined ? minPrice : undefined,
      lte: maxPrice !== undefined ? maxPrice : undefined,
    };
  }
  if (tags?.length) where.tags = { hasEvery: tags };
  if (onSale) where.compareAtPrice = { not: null };
  if (freeShipping) where.freeShipping = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : sort === "rating"
          ? { ratingAvg: "desc" }
          : sort === "newest"
            ? { createdAt: "desc" }
            : sort === "bestseller"
              ? { salesCount: "desc" }
              : { isFeatured: "desc" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productListSelect,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      visibility: "VISIBLE",
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variations: { where: { active: true }, orderBy: { name: "asc" } },
      brand: true,
      category: { include: { parent: true } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  return product;
}

export async function getRelatedProducts(productId: string, categoryId: string | null, tags: string[], limit = 4) {
  return prisma.product.findMany({
    where: {
      id: { not: productId },
      status: "ACTIVE",
      visibility: "VISIBLE",
      OR: [{ categoryId }, { tags: { hasSome: tags } }],
    },
    select: productListSelect,
    take: limit,
  });
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", visibility: "VISIBLE", isFeatured: true },
    select: productListSelect,
    take: limit,
  });
}

export async function getDiscountedProducts(limit = 8) {
  return prisma.product.findMany({
    where: {
      status: "ACTIVE",
      visibility: "VISIBLE",
      compareAtPrice: { not: null },
    },
    select: productListSelect,
    orderBy: { salesCount: "desc" },
    take: limit,
  });
}

export async function getActiveFlashSales() {
  const now = new Date();
  return prisma.flashSale.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: {
      products: {
        include: { product: { select: productListSelect } },
      },
    },
    take: 3,
  });
}

export async function incrementProductView(slug: string) {
  await prisma.product
    .update({
      where: { slug },
      data: { views: { increment: 1 } },
    })
    .catch(() => {});
}

const activeProductCount = {
  where: { status: "ACTIVE", visibility: "VISIBLE" },
} as const;

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  productCount: number;
};

export async function getCatalogCategories(): Promise<CategoryWithCount[]> {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: activeProductCount } },
    },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    parentId: c.parentId,
    productCount: c._count.products,
  }));
}

export type BrandWithCount = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export async function getCatalogBrands(): Promise<BrandWithCount[]> {
  const brands = await prisma.brand.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: activeProductCount } } },
  });
  return brands
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      productCount: b._count.products,
    }))
    .filter((b) => b.productCount > 0);
}

export type ProductDetailData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  freeShipping: boolean;
  ratingAvg: number;
  ratingCount: number;
  attributes: Record<string, unknown> | null;
  tags: string[];
  images: { id: string; url: string; alt: string | null }[];
  variations: {
    id: string;
    name: string;
    sku: string;
    price: number | null;
    compareAtPrice: number | null;
    stock: number;
    imageUrl: string | null;
  }[];
  quantityPrices: { minQuantity: number; discountPercent: number }[];
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null;
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: string;
    userName: string | null;
  }[];
};

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toString" in value) {
    const n = Number((value as { toString(): string }).toString());
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function getProductDetail(slug: string): Promise<ProductDetailData | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", visibility: "VISIBLE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variations: { where: { active: true }, orderBy: { name: "asc" } },
      quantityPrices: { orderBy: { minQuantity: "asc" } },
      brand: true,
      category: { include: { parent: true } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product) return null;

  const attributes =
    product.attributes && typeof product.attributes === "object"
      ? (product.attributes as Record<string, unknown>)
      : null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    price: decimalToNumber(product.price) ?? 0,
    compareAtPrice: decimalToNumber(product.compareAtPrice),
    stock: product.stock,
    freeShipping: product.freeShipping,
    ratingAvg: decimalToNumber(product.ratingAvg) ?? 0,
    ratingCount: product.ratingCount,
    attributes,
    tags: product.tags,
    images: product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt })),
    variations: product.variations.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: decimalToNumber(v.price),
      compareAtPrice: decimalToNumber(v.compareAtPrice),
      stock: v.stock,
      imageUrl: v.imageUrl,
    })),
    quantityPrices: product.quantityPrices.map((t) => ({
      minQuantity: t.minQuantity,
      discountPercent: decimalToNumber(t.discountPercent) ?? 0,
    })),
    brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
    category: product.category
      ? {
          name: product.category.name,
          slug: product.category.slug,
          parent: product.category.parent
            ? { name: product.category.parent.name, slug: product.category.parent.slug }
            : null,
        }
      : null,
    reviews: product.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      userName: r.user.name,
    })),
  };
}
