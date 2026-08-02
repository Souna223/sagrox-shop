"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Loader2, Search, Trash2 } from "lucide-react";
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
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { formatBRL, formatDateTime } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";

type OrderRow = {
  id: string;
  number: number;
  customerName: string;
  email: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  createdAt: string;
  _count: { items: number };
};

type OrdersTableProps = {
  initial: {
    items: OrderRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  q: string;
  status: string;
};

const STATUS_ITEMS = [
  { label: "Todos os status", value: "ALL" },
  { label: "Pendente", value: "PENDING" },
  { label: "Aguardando pagamento", value: "AWAITING_PAYMENT" },
  { label: "Pago", value: "PAID" },
  { label: "Em processamento", value: "PROCESSING" },
  { label: "Enviado", value: "SHIPPED" },
  { label: "Entregue", value: "DELIVERED" },
  { label: "Concluído", value: "COMPLETED" },
  { label: "Cancelado", value: "CANCELLED" },
  { label: "Reembolsado", value: "REFUNDED" },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

function buildUrl(pathname: string, q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function StatusPill({ value, map, style }: { value: string; map: Record<string, string>; style?: Record<string, string> }) {
  const label = map[value] ?? value;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        style?.[value] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export function OrdersTable({ initial, q, status }: OrdersTableProps) {
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

  const remove = async (order: OrderRow) => {
    if (!window.confirm(`Remover o pedido #${order.number}? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o pedido.");
        return;
      }
      toast.success("Pedido removido.");
      router.refresh();
    } catch {
      toast.error("Erro ao remover o pedido.");
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
            placeholder="Buscar por pedido, nome ou e-mail..."
            className="pl-9"
          />
        </form>
        <Select
          value={status || "ALL"}
          onValueChange={(v) => navigate(search, v ?? "ALL")}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="h-9 w-52">
            <SelectValue className="pr-6">
              {STATUS_ITEMS.find((s) => s.value === status)?.label ?? "Todos os status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead className="hidden md:table-cell">Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        #{order.number}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customerName}
                        <span className="hidden sm:inline"> • {order.email}</span>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {order._count.items} item{order._count.items === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatBRL(order.total)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {order.paymentMethod ? PAYMENT_METHOD[order.paymentMethod as keyof typeof PAYMENT_METHOD] ?? order.paymentMethod : "—"}
                      </p>
                      <StatusPill value={order.paymentStatus} map={PAYMENT_STATUS} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill value={order.status} map={ORDER_STATUS} style={STATUS_STYLE} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver pedido"
                        render={<Link href={`/admin/pedidos/${order.id}`} />}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover pedido"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === order.id}
                        onClick={() => remove(order)}
                      >
                        {deletingId === order.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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
                  <PaginationLink href={buildUrl(pathname, q, status, p)} isActive={p === initial.page}>
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
