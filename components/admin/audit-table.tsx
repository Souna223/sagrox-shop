"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { formatDateTime } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
};

type AuditTableProps = {
  initial: {
    items: AuditRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  entityType: string;
  action: string;
  q: string;
};

const ENTITY_LABELS: Record<string, string> = {
  product: "Produto",
  order: "Pedido",
  user: "Cliente",
  coupon: "Cupom",
  review: "Avaliação",
  announcement: "Anúncio",
  faq: "FAQ",
  setting: "Configuração",
};

const ACTION_STYLES: Record<string, string> = {
  "CRIADO": "bg-green-100 text-green-800",
  "ATUALIZADO": "bg-blue-100 text-blue-800",
  "REMOVIDO": "bg-red-100 text-red-700",
  "ATUALIZADA": "bg-blue-100 text-blue-800",
  "REMOVIDA": "bg-red-100 text-red-700",
};

function actionStyle(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_STYLES)) {
    if (action.includes(key)) return cls;
  }
  return "bg-gray-100 text-gray-600";
}

function buildUrl(pathname: string, entityType: string, action: string, q: string, page: number) {
  const params = new URLSearchParams();
  if (entityType && entityType !== "ALL") params.set("entityType", entityType);
  if (action) params.set("action", action);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function AuditTable({ initial, entityType, action, q }: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [filterEntity, setFilterEntity] = useState(entityType);
  const [filterAction, setFilterAction] = useState(action);

  const navigate = (e: string, a: string, s: string, page = 1) => {
    router.push(buildUrl(pathname, e, a, s, page));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(filterEntity, filterAction, search.trim());
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
            placeholder="Buscar por usuário ou ID..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-3">
          <Select
            value={filterEntity || "ALL"}
            onValueChange={(v) => {
              const next = v ?? "ALL";
              setFilterEntity(next);
              navigate(next, filterAction, search);
            }}
            items={[
              { label: "Todos os módulos", value: "ALL" },
              ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="pr-6">
                {ENTITY_LABELS[filterEntity] ?? "Todos os módulos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os módulos</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            placeholder="Ação (ex.: CRIADO)"
            className="h-9 w-40"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigate(filterEntity, filterAction.trim().toUpperCase(), search);
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => { setSearch(""); setFilterEntity("ALL"); setFilterAction(""); navigate("ALL", "", ""); }}>
            Limpar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead className="hidden md:table-cell">Usuário</TableHead>
              <TableHead className="hidden lg:table-cell">Detalhes</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum registro de auditoria encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionStyle(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{ENTITY_LABELS[log.entityType] ?? log.entityType}</div>
                    {log.entityId ? <div className="text-xs text-muted-foreground">{log.entityId}</div> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{log.user?.name ?? log.user?.email ?? "Sistema"}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-md lg:table-cell">
                    <pre className="line-clamp-2 overflow-hidden text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </pre>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {initial.totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildUrl(pathname, entityType, action, q, initial.page - 1)}
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
                  <PaginationLink href={buildUrl(pathname, entityType, action, q, p)} isActive={p === initial.page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href={buildUrl(pathname, entityType, action, q, initial.page + 1)}
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
