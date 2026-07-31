"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BR_STATE_NAMES } from "@/lib/constants";
import { onlyDigits } from "@/lib/br";

type Address = {
  id: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

type AddressForm = {
  id?: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  label: "Principal",
  zip: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isDefault: false,
};

export function AddressList({ initial }: { initial: Address[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, isDefault: addresses.length === 0 });
    setOpen(true);
  };

  const openEdit = (address: Address) => {
    setForm({
      id: address.id,
      label: address.label,
      zip: address.zip,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      isDefault: address.isDefault,
    });
    setOpen(true);
  };

  const fillCep = async (cep: string) => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = (await res.json()) as {
        ok: boolean;
        data?: { street?: string; neighborhood?: string; city?: string; state?: string };
      };
      if (res.ok && data.ok && data.data) {
        setForm((f) => ({
          ...f,
          street: f.street || (data.data!.street ?? ""),
          neighborhood: f.neighborhood || (data.data!.neighborhood ?? ""),
          city: f.city || (data.data!.city ?? ""),
          state: f.state || (data.data!.state ?? ""),
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/account/addresses/${form.id}` : "/api/account/addresses", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, complement: form.complement || undefined }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; data?: Address };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar o endereço.");
        return;
      }
      setOpen(false);
      router.refresh();
      toast.success(form.id ? "Endereço atualizado!" : "Endereço adicionado!");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (address: Address) => {
    if (!window.confirm(`Remover o endereço "${address.label}"?`)) return;
    setDeletingId(address.id);
    try {
      const res = await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o endereço.");
        return;
      }
      setAddresses((list) => list.filter((a) => a.id !== address.id));
      router.refresh();
      toast.success("Endereço removido.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {addresses.length} endereço{addresses.length === 1 ? "" : "s"} cadastrado
          {addresses.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Adicionar endereço
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <MapPin className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Nenhum endereço cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione um endereço para agilizar suas próximas compras.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="relative rounded-xl border bg-card p-4"
            >
              {address.isDefault ? (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star className="size-3 fill-current" /> Principal
                </span>
              ) : null}
              <p className="pr-20 text-sm font-semibold">{address.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {address.street}, {address.number}
                {address.complement ? ` — ${address.complement}` : ""}
                <br />
                {address.neighborhood} — {address.city}/{address.state}
                <br />
                CEP {address.zip}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(address)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(address)}
                  disabled={deletingId === address.id}
                >
                  {deletingId === address.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar endereço" : "Novo endereço"}</DialogTitle>
            <DialogDescription>Preencha os dados do endereço de entrega.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="label">Apelido</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex.: Casa, Trabalho"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="zip"
                  inputMode="numeric"
                  value={form.zip}
                  onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                  onBlur={(e) => fillCep(e.target.value)}
                  placeholder="00000-000"
                  required
                />
                {loadingCep ? <Loader2 className="size-4 animate-spin self-center text-muted-foreground" /> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={form.complement}
                  onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
                  placeholder="Apto, bloco..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={form.neighborhood}
                onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="SP"
                  maxLength={2}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {BR_STATE_NAMES[form.state] ?? "Ex.: SP, RJ, MG"}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={form.isDefault}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: !!v }))}
              />
              Usar como endereço principal
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
