"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SerializedFaq } from "@/lib/admin-content";

type FaqsSectionProps = {
  initial: { items: SerializedFaq[]; total: number };
};

type FormState = {
  question: string;
  answer: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY_FORM: FormState = { question: "", answer: "", sortOrder: "0", active: true };

function fromItem(item: SerializedFaq): FormState {
  return { question: item.question, answer: item.answer, sortOrder: String(item.sortOrder), active: item.active };
}

export function FaqsSection({ initial }: FaqsSectionProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SerializedFaq | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (item: SerializedFaq) => {
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
        question: form.question,
        answer: form.answer,
        sortOrder: form.sortOrder === "" ? undefined : Number(form.sortOrder),
        active: form.active,
      };
      const res = await fetch(editing ? `/api/admin/faqs/${editing.id}` : "/api/admin/faqs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar a FAQ.");
        return;
      }
      toast.success(editing ? "FAQ atualizada!" : "FAQ criada!");
      cancelForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: SerializedFaq) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/faqs/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao alterar a FAQ.");
        return;
      }
      toast.success(item.active ? "FAQ desativada." : "FAQ ativada.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: SerializedFaq) => {
    if (!window.confirm("Remover esta FAQ permanentemente?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/faqs/${item.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover a FAQ.");
        return;
      }
      toast.success("FAQ removida.");
      if (editing?.id === item.id) cancelForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {initial.total} pergunta{initial.total === 1 ? "" : "s"} cadastrada{initial.total === 1 ? "" : "s"}.
        </p>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="size-4" /> Nova FAQ
        </Button>
      </div>

      {creating || editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar FAQ" : "Nova FAQ"}</CardTitle>
            <CardDescription>As perguntas aparecem na página de ajuda da loja.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="faq-question">Pergunta *</Label>
                <Input id="faq-question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-answer">Resposta *</Label>
                <Textarea id="faq-answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="faq-order">Ordem</Label>
                  <Input
                    id="faq-order"
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  />
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} /> FAQ ativa
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar FAQ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {initial.items.length === 0 ? (
          <div className="rounded-xl border bg-background py-10 text-center text-sm text-muted-foreground">
            Nenhuma FAQ encontrada.
          </div>
        ) : (
          initial.items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.question}</p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        item.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {item.active ? "Ativa" : "Inativa"}
                    </span>
                    <span className="text-xs text-muted-foreground">Ordem: {item.sortOrder}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
