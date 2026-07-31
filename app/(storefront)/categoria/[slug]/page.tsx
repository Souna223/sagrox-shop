import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicProducts, getCatalogCategories, getCatalogBrands } from "@/lib/products";
import { CatalogView, type CatalogResult } from "@/components/storefront/catalog-view";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getDictionary } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findFirst({
    where: { slug, active: true },
    select: { name: true, seoTitle: true, seoDescription: true, description: true },
  });
  const t = await getDictionary();
  if (!category) return { title: t.account.categoryNotFound };
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = await getDictionary();

  const category = await prisma.category.findFirst({
    where: { slug, active: true },
    include: {
      parent: true,
      children: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!category) notFound();

  const min = parseFloat((sp.min ?? "").replace(",", "."));
  const max = parseFloat((sp.max ?? "").replace(",", "."));

  const [result, categories, brands] = await Promise.all([
    getPublicProducts({
      category: slug,
      brand: sp.marca || undefined,
      q: sp.q || undefined,
      sort: (sp.ordem as "relevance" | "price_asc" | "price_desc" | "rating" | "newest" | "bestseller") ?? "relevance",
      minPrice: Number.isNaN(min) ? undefined : min,
      maxPrice: Number.isNaN(max) ? undefined : max,
      minRating: Number(sp.avaliacao) > 0 ? Number(sp.avaliacao) : undefined,
      onSale: sp.promocao === "1",
      freeShipping: sp.frete === "1",
      inStockOnly: sp.estoque === "1",
      page: Math.max(1, Number(sp.pagina) || 1),
      perPage: 24,
    }),
    getCatalogCategories(),
    getCatalogBrands(),
  ]);

  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && v !== "0") queryParams.set(k, v);
  }

  const resultData: CatalogResult = {
    products: result.products as CatalogResult["products"],
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };

  const basePath = `/categoria/${category.slug}`;

  const breadcrumb = (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/" />}>{t.account.home}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/produtos" />}>{t.catalog.productsTitle}</BreadcrumbLink>
        </BreadcrumbItem>
        {category.parent ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/categoria/${category.parent.slug}`} />}>
                {category.parent.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : null}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{category.name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <div>
      {category.children.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pt-8">
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/categoria/${child.slug}`}
                className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <CatalogView
        title={category.name}
        description={category.description ?? undefined}
        basePath={basePath}
        currentCategory={slug}
        categories={categories}
        brands={brands}
        result={resultData}
        params={queryParams}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
