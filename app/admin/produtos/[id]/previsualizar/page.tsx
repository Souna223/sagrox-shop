import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { getProductDetailById, getRelatedProducts } from "@/lib/products";
import { ProductDetail, ProductDescriptionTabs } from "@/components/storefront/product-detail";
import { ProductCard } from "@/components/storefront/product-card";
import Link from "next/link";
import { PublishProductButton } from "./publish-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";

export const metadata: Metadata = {
  title: "Pré-visualizar produto",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductPreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const t = await getDictionary();

  const [product, relatedProducts] = await Promise.all([
    getProductDetailById(id),
    prisma.product.findFirst({
      where: { id },
      select: { id: true, categoryId: true, tags: true, status: true },
    }),
  ]);

  if (!product || !relatedProducts) notFound();

  const related = relatedProducts
    ? await getRelatedProducts(relatedProducts.id, relatedProducts.categoryId, relatedProducts.tags, 4)
    : [];
  const isDraft = relatedProducts.status === "DRAFT";

  return (
    <I18nProvider>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Pré-visualização da página</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDraft ? (
              <>
                Este produto está como{" "}
                <span className="font-medium text-amber-600">rascunho</span> — nenhum cliente o vê.
                A página abaixo é exatamente como ficará após publicar.
              </>
            ) : (
              "Este produto já está publicado na loja."
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/admin/produtos/${product.id}/editar`}
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            Editar
          </Link>
          <PublishProductButton productId={product.id} slug={product.slug} disabled={!isDraft} />
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>{t.account.home}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/produtos" />}>{t.catalog.productsTitle}</BreadcrumbLink>
              </BreadcrumbItem>
              {product.category ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={`/categoria/${product.category.slug}`} />}>
                      {product.category.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <ProductDetail product={product} />
          <ProductDescriptionTabs product={product} />

          {related.length > 0 ? (
            <section className="mt-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold sm:text-2xl">{t.productDetail.relatedProducts}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {related.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      </div>
    </I18nProvider>
  );
}