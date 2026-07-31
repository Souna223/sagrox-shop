import Link from "next/link";
import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import { ProductFilters } from "@/components/storefront/product-filters";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageNumbers, buildCatalogUrl } from "@/lib/catalog";
import type { CategoryWithCount, BrandWithCount } from "@/lib/products";
import { getDictionary } from "@/lib/i18n/server";

export type CatalogResult = {
  products: ProductCardData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

type CatalogViewProps = {
  title: string;
  description?: string;
  basePath: string;
  currentCategory?: string;
  categories: CategoryWithCount[];
  brands: BrandWithCount[];
  result: CatalogResult;
  params: URLSearchParams;
  breadcrumb?: React.ReactNode;
};

function FiltersFallback() {
  return <div className="hidden lg:block"><Skeleton className="h-80 w-full" /></div>;
}

export async function CatalogView({
  title,
  description,
  basePath,
  currentCategory,
  categories,
  brands,
  result,
  params,
  breadcrumb,
}: CatalogViewProps) {
  const { products, total, page, totalPages } = result;
  const t = await getDictionary();

  const pageLinks = getPageNumbers(page, totalPages);
  const paginate = (p: number) => buildCatalogUrl(basePath, params, { pagina: String(p) });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {breadcrumb}
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:block">
          <Suspense fallback={<FiltersFallback />}>
            <ProductFilters
              categories={categories}
              brands={brands}
              basePath={basePath}
              currentCategory={currentCategory}
              total={total}
            />
          </Suspense>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border py-20 text-center">
              <PackageSearch className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">{t.catalog.noProducts}</p>
                <p className="text-sm text-muted-foreground">
                  {t.catalog.adjustFilters}
                </p>
              </div>
              <Link href={basePath} className="text-sm font-medium text-primary hover:underline">
                {t.catalog.clearFilters}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={page === 1 && i < 4} />
                ))}
              </div>

              {totalPages > 1 ? (
                <Pagination className="mt-10">
                  <PaginationContent>
                    {page > 1 ? (
                      <PaginationItem>
                        <PaginationPrevious href={paginate(page - 1)} text={t.catalog.previous} />
                      </PaginationItem>
                    ) : null}
                    {pageLinks.map((p, i) =>
                      p === "…" ? (
                        <PaginationItem key={`e${i}`}>
                          <PaginationLink href="#" isActive={false} aria-disabled>
                            …
                          </PaginationLink>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink href={paginate(p)} isActive={p === page}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    {page < totalPages ? (
                      <PaginationItem>
                        <PaginationNext href={paginate(page + 1)} text={t.catalog.next} />
                      </PaginationItem>
                    ) : null}
                  </PaginationContent>
                </Pagination>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
