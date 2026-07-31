import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProductDetail, getRelatedProducts, incrementProductView } from "@/lib/products";
import { ProductDetail, ProductDescriptionTabs } from "@/components/storefront/product-detail";
import { ProductCard } from "@/components/storefront/product-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", visibility: "VISIBLE" },
    select: { name: true, shortDescription: true, seoTitle: true, seoDescription: true },
  });
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, related] = await Promise.all([
    getProductDetail(slug),
    prisma.product.findFirst({
      where: { slug, status: "ACTIVE", visibility: "VISIBLE" },
      select: { id: true, categoryId: true, tags: true },
    }),
  ]);

  if (!product) notFound();
  incrementProductView(slug);

  const relatedProducts = related
    ? await getRelatedProducts(related.id, related.categoryId, related.tags, 4)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Início</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/produtos" />}>Produtos</BreadcrumbLink>
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

      {relatedProducts.length > 0 ? (
        <section className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl">Você também pode gostar</h2>
            <Link
              href={`/categoria/${product.category?.slug ?? "produtos"}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver mais
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
