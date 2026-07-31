"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Loader2, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getPageNumbers } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { SerializedAnnouncement } from "@/lib/admin-content";

type AnnouncementsSectionProps = {
  initial: {
    items: SerializedAnnouncement[];
    total: number;
    page: number;
    totalPages: number;
  };
  q: string;
  active: string;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildUrl(pathname: string, q: string, active: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (active && active !== "ALL") params.set("active", active);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type FormState = {
  message: string;
  link: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const EMPTY_FORM: FormState = { message: "", link: "", startsAt: "", endsAt: "", active: true };

function fromItem(item: SerializedAnnouncement): FormState {
  return {
    message: item.message,
    link: item.link ?? "",
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
    active: item.active,
  };
}

export function AnnouncementsSection({ initial, q, active }: AnnouncementsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [filterActive, setFilterActive] = useState(active);
  const [editing, setEditing] = useState<SerializedAnnouncement | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const navigate = (nextQ: string, nextActive: string, page = 1) => {
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextActive && nextActive !== "ALL") params.set("active", nextActive);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim(), filterActive);
  };

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (item: SerializedAnnouncement) => {
    setForm(fromItem(item));
    setCreating(false);
    setEditing(item);
  };

  const cancelForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        message: form.message,
        link: form.link || undefined,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        active: form.active,
      };
      const res = await fetch(
        editing ? `/api/admin/announcements/${editing.id}` : "/api/admin/announcements",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar o anúncio.");
        return;
      }
      toast.success(editing ? "Anúncio atualizado!" : "Anúncio criado!");
      cancelForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: SerializedAnnouncement) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao alterar o anúncio.");
        return;
      }
      toast.success(item.active ? "Anúncio desativado." : "Anúncio ativado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: SerializedAnnouncement) => {
    if (!window.confirm("Remover este anúncio permanentemente?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o anúncio.");
        return;
      }
      toast.success("Anúncio removido.");
      if (editing?.id === item.id) cancelForm();
      router.refresh();
    } finally {
      setBusy(false);
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
            placeholder="Buscar por mensagem..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-3">
          <Select
            value={filterActive || "ALL"}
            onValueChange={(v) => {
              const next = v ?? "ALL";
              setFilterActive(next);
              navigate(search, next);
            }}
            items={[
              { label: "Todos", value: "ALL" },
              { label: "Ativos", value: "ACTIVE" },
              { label: "Inativos", value: "INACTIVE" },
            ]}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue className="pr-6">
                {filterActive === "ACTIVE" ? "Ativos" : filterActive === "INACTIVE" ? "Inativos" : "Todos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativos</SelectItem>
              <SelectItem value="INACTIVE">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={startCreate} disabled={creating}>
            <Plus className="size-4" /> Novo anúncio
          </Button>
        </div>
      </div>

      {creating || editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar anúncio" : "Novo anúncio"}</CardTitle>
            <CardDescription>O anúncio aparece na barra superior da loja durante o período de vigência.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-message">Mensagem *</Label>
                <Textarea
                  id="ann-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-link">Link (opcional)</Label>
                <Input
                  id="ann-link"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-starts">Vigência a partir de</Label>
                  <Input id="ann-starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-ends">Até</Label>
                  <Input id="ann-ends" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} /> Anúncio ativo
              </label>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar anúncio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mensagem</TableHead>
              <TableHead className="hidden md:table-cell">Vigência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum anúncio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              initial.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="line-clamp-1 text-sm font-medium">{item.message}</p>
                    {item.link ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{item.link}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.startsAt || item.endsAt ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {item.startsAt ? formatDateTime(item.startsAt) : "—"} até {item.endsAt ? formatDateTime(item.endsAt) : "—"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem período definido</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        item.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => startEdit(item)} disabled={busy}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={item.active ? "Desativar" : "Ativar"}
                        onClick={() => toggle(item)}
                        disabled={busy}
                      >
                        {item.active ? <X className="size-4" /> : <Check className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(item)}
                        disabled={busy}
                      >
                        <Trash2 className="size-4" />
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
