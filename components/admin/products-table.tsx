"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatBRL } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  visibility: string;
  brand: { name: string } | null;
  category: { name: string } | null;
  images: { url: string }[];
  _count: { variations: number };
};

type ProductsTableProps = {
  initial: {
    items: ProductRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  q: string;
  status: string;
};

function buildUrl(pathname: string, q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ProductsTable({ initial, q, status }: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const navigate = (nextQ: string, nextStatus: string, page = 1) => {
    router.push(buildUrl(pathname, nextQ, nextStatus, page));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), status);
  };

  const remove = async (product: ProductRow) => {
    if (!window.confirm(`Remover o produto "${product.name}"? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o produto.");
        return;
      }
      toast.success("Produto removido.");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const pages = getPageNumbers(initial.page, initial.totalPages);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={submitSearch} className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, SKU ou slug..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-3">
          <Select
            value={status || "ALL"}
            onValueChange={(v) => navigate(search, v ?? "ALL")}
            items={[
              { label: "Todos os status", value: "ALL" },
              { label: "Rascunho", value: "DRAFT" },
              { label: "Ativo", value: "ACTIVE" },
              { label: "Inativo", value: "INACTIVE" },
            ]}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="pr-6">
                {status === "DRAFT" ? "Rascunho" : status === "ACTIVE" ? "Ativo" : status === "INACTIVE" ? "Inativo" : "Todos os status"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Button render={<Link href="/admin/produtos/novo" />}>
            <Plus className="size-4" /> Novo produto
          </Button>
          <Button variant="outline" render={<Link href="/admin/produtos/importar" />}>
            <Link2 className="size-4" /> Importar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((product) => {
                const lowStock = product.stock <= product.lowStockThreshold;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].url} alt="" className="size-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/produtos/${product.id}/editar`}
                            className="line-clamp-2 text-sm font-medium hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {product.category?.name ?? "Sem categoria"}
                            {product._count.variations > 0
                              ? ` • ${product._count.variations} variações`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{product.sku}</TableCell>
                    <TableCell className="text-sm font-medium">{formatBRL(product.price)}</TableCell>
                    <TableCell>
                      <span className={product.stock <= 0 ? "font-semibold text-destructive" : lowStock ? "font-semibold text-amber-600" : "text-sm"}>
                        {product.stock <= 0 ? "Esgotado" : product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={product.status === "ACTIVE" ? "default" : product.status === "INACTIVE" ? "secondary" : "outline"}>
                        {product.status === "ACTIVE" ? "Ativo" : product.status === "INACTIVE" ? "Inativo" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar"
                          render={<Link href={`/admin/produtos/${product.id}/editar`} />}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remover"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => remove(product)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {initial.totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildUrl(pathname, q, status, initial.page - 1)}
                text="Anterior"
                aria-disabled={initial.page <= 1}
                onClick={initial.page <= 1 ? (e) => e.preventDefault() : undefined}
                className={initial.page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pages.map((p, index) =>
              p === "…" ? (
                <PaginationItem key={`e-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={buildUrl(pathname, q, status, p)}
                    isActive={p === initial.page}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href={buildUrl(pathname, q, status, initial.page + 1)}
                text="Próxima"
                aria-disabled={initial.page >= initial.totalPages}
                onClick={initial.page >= initial.totalPages ? (e) => e.preventDefault() : undefined}
                className={initial.page >= initial.totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
