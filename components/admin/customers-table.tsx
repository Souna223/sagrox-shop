"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Search } from "lucide-react";
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
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate, formatPhone, getInitials } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  isBlocked: boolean;
  isVip: boolean;
  newsletter: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number; addresses: number };
};

type CustomersTableProps = {
  initial: {
    items: CustomerRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  q: string;
  role: string;
  blocked: string;
};

const ROLE_ITEMS = [
  { label: "Todos os perfis", value: "ALL" },
  { label: "Cliente", value: "CUSTOMER" },
  { label: "Administrador", value: "ADMIN" },
  { label: "Gerente", value: "MANAGER" },
  { label: "Funcionário", value: "EMPLOYEE" },
];

const BLOCKED_ITEMS = [
  { label: "Todos os clientes", value: "ALL" },
  { label: "Ativos", value: "ACTIVE" },
  { label: "Bloqueados", value: "BLOCKED" },
];

function buildUrl(pathname: string, q: string, role: string, blocked: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role && role !== "ALL") params.set("role", role);
  if (blocked && blocked !== "ALL") params.set("blocked", blocked);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function CustomersTable({ initial, q, role, blocked }: CustomersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);

  const navigate = (nextQ: string, nextRole: string, nextBlocked: string, page = 1) => {
    router.push(buildUrl(pathname, nextQ, nextRole, nextBlocked, page));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), role, blocked);
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
            placeholder="Buscar por nome, e-mail, CPF ou telefone..."
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={role || "CUSTOMER"}
            onValueChange={(v) => navigate(search, v ?? "ALL", blocked)}
            items={ROLE_ITEMS}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="pr-6">
                {ROLE_ITEMS.find((r) => r.value === role)?.label ?? "Todos os perfis"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={blocked || "ALL"}
            onValueChange={(v) => navigate(search, role, v ?? "ALL")}
            items={BLOCKED_ITEMS}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="pr-6">
                {BLOCKED_ITEMS.find((b) => b.value === blocked)?.label ?? "Todos os clientes"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BLOCKED_ITEMS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Perfil</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(customer.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{customer.name}</span>
                          {customer.isVip ? (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              VIP
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {customer.email}
                          {customer.phone ? ` • ${formatPhone(customer.phone)}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{ROLE_LABEL[customer.role as keyof typeof ROLE_LABEL] ?? customer.role}</span>
                    {customer.isBlocked ? (
                      <span
                        className={cn(
                          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          "bg-red-100 text-red-700",
                        )}
                      >
                        Bloqueado
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{customer._count.orders}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver cliente"
                        render={<Link href={`/admin/clientes/${customer.id}`} />}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
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
                href={buildUrl(pathname, q, role, blocked, initial.page - 1)}
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
                  <PaginationLink href={buildUrl(pathname, q, role, blocked, p)} isActive={p === initial.page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href={buildUrl(pathname, q, role, blocked, initial.page + 1)}
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
