"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Search, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  product: { id: string; name: string; slug: string; images: { url: string }[] } | null;
  user: { id: string; name: string | null; email: string } | null;
};

type ReviewsTableProps = {
  initial: {
    items: ReviewRow[];
    total: number;
    pending: number;
    page: number;
    totalPages: number;
  };
  q: string;
  status: string;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Aprovada", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejeitada", className: "bg-red-100 text-red-700" },
};

function buildUrl(pathname: string, q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ReviewsTable({ initial, q, status }: ReviewsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState("");
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (review: ReviewRow) => {
    setEditing(review);
    setEditRating(review.rating);
    setEditTitle(review.title ?? "");
    setEditComment(review.comment ?? "");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, title: editTitle, comment: editComment }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar a avaliação.");
        return;
      }
      toast.success("Avaliação atualizada.");
      setEditing(null);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  };

  const navigate = (nextQ: string, nextStatus: string, page = 1) => {
    router.push(buildUrl(pathname, nextQ, nextStatus, page));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), status);
  };

  const setStatus = async (review: ReviewRow, next: "APPROVED" | "REJECTED") => {
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao atualizar a avaliação.");
        return;
      }
      toast.success(next === "APPROVED" ? "Avaliação aprovada." : "Avaliação rejeitada.");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar a avaliação.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: ReviewRow) => {
    if (!window.confirm("Remover esta avaliação permanentemente?")) return;
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover a avaliação.");
        return;
      }
      toast.success("Avaliação removida.");
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
            placeholder="Buscar por produto, cliente ou texto..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-3">
          {initial.pending > 0 ? (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
              {initial.pending} pendente{initial.pending === 1 ? "" : "s"}
            </span>
          ) : null}
          <Select
            value={status || "ALL"}
            onValueChange={(v) => navigate(search, v ?? "ALL")}
            items={[
              { label: "Todos os status", value: "ALL" },
              { label: "Pendente", value: "PENDING" },
              { label: "Aprovada", value: "APPROVED" },
              { label: "Rejeitada", value: "REJECTED" },
            ]}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue className="pr-6">
                {STATUS_META[status]?.label ?? "Todos os status"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="APPROVED">Aprovada</SelectItem>
              <SelectItem value="REJECTED">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">Avaliação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((review) => {
                const meta = STATUS_META[review.status] ?? STATUS_META.PENDING;
                return (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {review.product?.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={review.product.images[0].url} alt="" className="size-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-medium">{review.product?.name ?? "Produto removido"}</p>
                          <p className="text-xs text-muted-foreground">
                            {review.user?.name ?? review.user?.email ?? "Cliente anônimo"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-sm md:table-cell">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`size-3.5 ${s <= review.rating ? "fill-current" : "opacity-30"}`} />
                        ))}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">{review.rating}/5</span>
                      </div>
                      {review.title ? <p className="mt-1 text-sm font-medium">{review.title}</p> : null}
                      {review.comment ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{review.comment}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatDateTime(review.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {review.status !== "APPROVED" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Aprovar"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => setStatus(review, "APPROVED")}
                            disabled={busyId === review.id}
                          >
                            <Check className="size-4" />
                          </Button>
                        ) : null}
                        {review.status !== "REJECTED" ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Rejeitar"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setStatus(review, "REJECTED")}
                            disabled={busyId === review.id}
                          >
                            <X className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(review)}
                          disabled={busyId === review.id}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remover"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => remove(review)}
                          disabled={busyId === review.id}
                        >
                          {busyId === review.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        {editing && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar avaliação</DialogTitle>
              <DialogDescription>
                {editing.product?.name ?? "Produto removido"} — {editing.user?.name ?? editing.user?.email ?? "Cliente anônimo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nota</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditRating(s)}
                      className="rounded p-0.5 transition-colors hover:scale-110"
                      aria-label={`${s} estrelas`}
                    >
                      <Star
                        className={`size-6 ${s <= editRating ? "fill-current text-amber-500" : "opacity-30"}`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">{editRating}/5</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Título da avaliação"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-comment">Comentário</Label>
                <textarea
                  id="edit-comment"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Comentário da avaliação"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
