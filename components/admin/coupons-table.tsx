"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatBRL, formatDate } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type CouponRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  minAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  active: boolean;
  expiresAt: string | null;
  _count: { usages: number };
};

type CouponsTableProps = {
  initial: {
    items: CouponRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  q: string;
  active: string;
};

function buildUrl(pathname: string, q: string, active: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (active && active !== "ALL") params.set("active", active);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function CouponsTable({ initial, q, active }: CouponsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);

  const navigate = (nextQ: string, nextActive: string, page = 1) => {
    router.push(buildUrl(pathname, nextQ, nextActive, page));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), active);
  };

  const toggleActive = async (coupon: CouponRow) => {
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
          minAmount: coupon.minAmount,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          perUserLimit: coupon.perUserLimit,
          active: !coupon.active,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao atualizar o cupom.");
        return;
      }
      toast.success(coupon.active ? "Cupom desativado." : "Cupom ativado.");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o cupom.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (coupon: CouponRow) => {
    if (!window.confirm(`Remover o cupom "${coupon.code}"? Essa ação não pode ser desfeita.`)) return;
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o cupom.");
        return;
      }
      toast.success("Cupom removido.");
      router.refresh();
    } finally {
      setBusyId(null);
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
            placeholder="Buscar por código ou nome..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-3">
          <Select
            value={active || "ALL"}
            onValueChange={(v) => navigate(search, v ?? "ALL")}
            items={[
              { label: "Todos", value: "ALL" },
              { label: "Ativos", value: "ACTIVE" },
              { label: "Inativos", value: "INACTIVE" },
            ]}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue className="pr-6">
                {active === "ACTIVE" ? "Ativos" : active === "INACTIVE" ? "Inativos" : "Todos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativos</SelectItem>
              <SelectItem value="INACTIVE">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button render={<Link href="/admin/cupons/novo" />}>
            <Plus className="size-4" /> Novo cupom
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead className="hidden md:table-cell">Desconto</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead className="hidden lg:table-cell">Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cupom encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((coupon) => {
                const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/cupons/${coupon.id}/editar`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {coupon.code}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{coupon.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {coupon.type === "PERCENT" ? `${coupon.value}%` : coupon.type === "FIXED" ? formatBRL(coupon.value) : "Frete grátis"}
                      {coupon.minAmount ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (mín. {formatBRL(coupon.minAmount)})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon._count.usages}
                      {coupon.usageLimit ? <span className="text-xs text-muted-foreground"> / {coupon.usageLimit}</span> : null}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {coupon.expiresAt ? (
                        <span className={isExpired ? "font-medium text-destructive" : ""}>
                          {formatDate(coupon.expiresAt)}
                          {isExpired ? " (expirado)" : ""}
                        </span>
                      ) : (
                        "Sem validade"
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          coupon.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {coupon.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar"
                          render={<Link href={`/admin/cupons/${coupon.id}/editar`} />}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={coupon.active ? "Desativar" : "Ativar"}
                          onClick={() => toggleActive(coupon)}
                          disabled={busyId === coupon.id}
                          className="text-muted-foreground"
                        >
                          {busyId === coupon.id ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remover"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => remove(coupon)}
                          disabled={busyId === coupon.id}
                        >
                          <Trash2 className="size-4" />
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
                href={buildUrl(pathname, q, active, initial.page - 1)}
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
                  <PaginationLink href={buildUrl(pathname, q, active, p)} isActive={p === initial.page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href={buildUrl(pathname, q, active, initial.page + 1)}
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
