"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldBan, ShieldCheck, Star, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type CustomerActionsProps = {
  customerId: string;
  isBlocked: boolean;
  isVip: boolean;
  isActive: boolean;
};

export function CustomerActions({ customerId, isBlocked, isVip, isActive }: CustomerActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const patch = async (field: string, value: boolean) => {
    setBusy(field);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao atualizar o cliente.");
        return;
      }
      toast.success("Cliente atualizado.");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o cliente.");
    } finally {
      setBusy(null);
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy("note");
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar a nota.");
        return;
      }
      setNote("");
      toast.success("Nota salva.");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar a nota.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="text-sm font-semibold">Ações</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={isBlocked ? "outline" : "destructive"}
          size="sm"
          onClick={() => patch("isBlocked", !isBlocked)}
          disabled={busy !== null}
        >
          {busy === "isBlocked" ? <Loader2 className="size-4 animate-spin" /> : isBlocked ? <ShieldCheck className="size-4" /> : <ShieldBan className="size-4" />}
          {isBlocked ? "Desbloquear" : "Bloquear"}
        </Button>
        <Button
          variant={isVip ? "outline" : "default"}
          size="sm"
          onClick={() => patch("isVip", !isVip)}
          disabled={busy !== null}
        >
          {busy === "isVip" ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
          {isVip ? "Remover VIP" : "Marcar VIP"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => patch("isActive", !isActive)}
          disabled={busy !== null}
        >
          {busy === "isActive" ? <Loader2 className="size-4 animate-spin" /> : null}
          {isActive ? "Desativar conta" : "Reativar conta"}
        </Button>
      </div>

      <form onSubmit={addNote} className="mt-5 space-y-2 border-t pt-4">
        <Label htmlFor="customer-note">Adicionar nota interna</Label>
        <Textarea
          id="customer-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: cliente solicita nota fiscal, preferência por entrega à tarde..."
          rows={3}
        />
        <Button type="submit" size="sm" disabled={busy !== null || !note.trim()}>
          {busy === "note" ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
          Salvar nota
        </Button>
      </form>
    </div>
  );
}
