import type { Metadata } from "next";
import { getPublicProducts, getCatalogCategories, getCatalogBrands } from "@/lib/products";
import { CatalogView, type CatalogResult } from "@/components/storefront/catalog-view";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Confira todos os produtos da nossa loja. Compre online com entrega para todo o Brasil.",
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    marca?: string;
    ordem?: string;
    min?: string;
    max?: string;
    avaliacao?: string;
    promocao?: string;
    frete?: string;
    estoque?: string;
    pagina?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const min = parseFloat((sp.min ?? "").replace(",", "."));
  const max = parseFloat((sp.max ?? "").replace(",", "."));

  const [result, categories, brands] = await Promise.all([
    getPublicProducts({
      category: sp.categoria || undefined,
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

  return (
    <CatalogView
      title={sp.q ? `Resultados para "${sp.q}"` : "Produtos"}
      description={sp.q ? undefined : "Encontre produtos com ótimos preços, parcelamento em até 12x e entrega para todo o Brasil."}
      basePath="/produtos"
      categories={categories}
      brands={brands}
      result={resultData}
      params={queryParams}
    />
  );
}
