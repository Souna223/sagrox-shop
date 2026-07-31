"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildCatalogUrl } from "@/lib/catalog";
import type { CategoryWithCount, BrandWithCount } from "@/lib/products";

type ProductFiltersProps = {
  categories: CategoryWithCount[];
  brands: BrandWithCount[];
  basePath: string;
  currentCategory?: string;
  total: number;
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "rating", label: "Melhor avaliação" },
  { value: "bestseller", label: "Mais vendidos" },
];

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{label}</h4>
      {children}
    </div>
  );
}

export function ProductFilters({
  categories,
  brands,
  basePath,
  currentCategory,
  total,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q");
  const marca = searchParams.get("marca");
  const ordem = searchParams.get("ordem") ?? "relevance";
  const promocao = searchParams.get("promocao") === "1";
  const frete = searchParams.get("frete") === "1";
  const estoque = searchParams.get("estoque") === "1";
  const avaliacao = Number(searchParams.get("avaliacao") ?? "0");

  const [min, setMin] = useState(searchParams.get("min") ?? "");
  const [max, setMax] = useState(searchParams.get("max") ?? "");

  const navigate = (overrides: Record<string, string | null>) => {
    router.push(buildCatalogUrl(basePath, searchParams, overrides));
  };

  const applyPrice = () => {
    navigate({ min: min || null, max: max || null });
  };

  const topLevel = categories.filter((c) => !c.parentId);
  const selectedBrand = brands.find((b) => b.slug === marca);

  const filterContent = (
    <div className="space-y-6">
      {q ? (
        <FilterRow label="Busca">
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            &ldquo;{q}&rdquo;
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => navigate({ q: null })}
            >
              <X className="size-3" /> limpar
            </button>
          </p>
        </FilterRow>
      ) : null}

      {topLevel.length > 0 ? (
        <FilterRow label="Categorias">
          <ul className="space-y-1">
            <li>
              <a
                href={buildCatalogUrl(basePath, searchParams, { categoria: null, marca: null })}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                  !currentCategory && !marca ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                <span>Todos os produtos</span>
                <span className="text-xs">{total}</span>
              </a>
            </li>
            {topLevel.map((c) => (
              <li key={c.id}>
                <a
                  href={buildCatalogUrl(basePath, searchParams, {
                    categoria: currentCategory ? null : c.slug,
                    marca: null,
                  })}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                    currentCategory === c.slug ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center">
                    {currentCategory === c.slug ? <ChevronRight className="mr-1 size-3.5" /> : null}
                    {c.name}
                  </span>
                  <span className="text-xs">{c.productCount}</span>
                </a>
              </li>
            ))}
          </ul>
        </FilterRow>
      ) : null}

      {brands.length > 0 ? (
        <FilterRow label="Marcas">
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={marca === b.slug}
                  onCheckedChange={(checked) =>
                    navigate({ marca: checked ? b.slug : null })
                  }
                />
                <span className="flex-1">{b.name}</span>
                <span className="text-xs text-muted-foreground">{b.productCount}</span>
              </label>
            ))}
          </div>
        </FilterRow>
      ) : null}

      <FilterRow label="Preço">
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^\d,.]/g, ""))}
            aria-label="Preço mínimo"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            inputMode="decimal"
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^\d,.]/g, ""))}
            aria-label="Preço máximo"
          />
        </div>
        <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={applyPrice}>
          Aplicar
        </Button>
      </FilterRow>

      <FilterRow label="Ofertas">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={promocao}
            onCheckedChange={(checked) => navigate({ promocao: checked ? "1" : null })}
          />
          Com desconto
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={frete}
            onCheckedChange={(checked) => navigate({ frete: checked ? "1" : null })}
          />
          Frete grátis
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={estoque}
            onCheckedChange={(checked) => navigate({ estoque: checked ? "1" : null })}
          />
          Em estoque
        </label>
      </FilterRow>

      <FilterRow label="Avaliação">
        <ul className="space-y-1">
          {[4, 3].map((r) => (
            <li key={r}>
              <a
                href={buildCatalogUrl(basePath, searchParams, {
                  avaliacao: avaliacao === r ? null : String(r),
                })}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                  avaliacao === r ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                {"★".repeat(r)}<span className="text-xs">e acima</span>
              </a>
            </li>
          ))}
        </ul>
      </FilterRow>

      {selectedBrand ? (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span>Marca: {selectedBrand.name}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => navigate({ marca: null })}
          >
            remover
          </button>
        </div>
      ) : null}
    </div>
  );

  const sortControl = (
    <Select
      value={ordem}
      onValueChange={(value) => navigate({ ordem: value })}
      items={SORT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
    >
      <SelectTrigger className="h-9 w-full sm:w-auto">
        <SelectValue className="pr-6">
          {SORT_OPTIONS.find((o) => o.value === ordem)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="size-4" /> Filtros
                </Button>
              }
            />
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{filterContent}</div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            <span>{total} produto{total === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="w-full max-w-56">{sortControl}</div>
      </div>

      <div className="hidden lg:block">
        {filterContent}
      </div>
    </div>
  );
}
