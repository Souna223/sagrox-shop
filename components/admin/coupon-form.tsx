"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUPON_TYPE_LABEL } from "@/lib/constants";

type CouponFormProps = {
  couponId?: string;
  initial?: {
    code: string;
    name: string;
    description: string | null;
    type: string;
    value: number;
    minAmount: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    perUserLimit: number | null;
    startsAt: string | null;
    expiresAt: string | null;
    active: boolean;
  };
};

const num = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v);

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_ITEMS = [
  { label: COUPON_TYPE_LABEL.PERCENT, value: "PERCENT" },
  { label: COUPON_TYPE_LABEL.FIXED, value: "FIXED" },
  { label: COUPON_TYPE_LABEL.FREE_SHIPPING, value: "FREE_SHIPPING" },
];

export function CouponForm({ couponId, initial }: CouponFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState(initial?.type ?? "PERCENT");
  const [value, setValue] = useState(num(initial?.value));
  const [minAmount, setMinAmount] = useState(num(initial?.minAmount));
  const [maxDiscount, setMaxDiscount] = useState(num(initial?.maxDiscount));
  const [usageLimit, setUsageLimit] = useState(num(initial?.usageLimit));
  const [perUserLimit, setPerUserLimit] = useState(num(initial?.perUserLimit ?? 1));
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [expiresAt, setExpiresAt] = useState(toLocalInput(initial?.expiresAt ?? null));
  const [active, setActive] = useState(initial?.active ?? true);

  const toNumber = (v: string) => (v === "" ? undefined : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code,
        name,
        description: description || undefined,
        type,
        value: toNumber(value),
        minAmount: toNumber(minAmount),
        maxDiscount: toNumber(maxDiscount),
        usageLimit: toNumber(usageLimit),
        perUserLimit: Number(perUserLimit || 1),
        startsAt: startsAt || undefined,
        expiresAt: expiresAt || undefined,
        active,
      };

      const res = await fetch(couponId ? `/api/admin/coupons/${couponId}` : "/api/admin/coupons", {
        method: couponId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar o cupom.");
        return;
      }

      toast.success(couponId ? "Cupom atualizado!" : "Cupom criado!");
      router.push("/admin/cupons");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{couponId ? "Editar cupom" : "Novo cupom"}</h1>
          <p className="text-sm text-muted-foreground">
            {couponId ? "Atualize as informações do cupom." : "Crie um cupom de desconto para a loja."}
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar cupom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
          <CardDescription>Dados gerais do cupom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex.: BEMVINDO10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome interno *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Cupom de boas-vindas para novos clientes"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desconto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de desconto</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "PERCENT")} items={TYPE_ITEMS}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue className="pr-6">
                    {COUPON_TYPE_LABEL[type as keyof typeof COUPON_TYPE_LABEL] ?? type}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">
                {type === "PERCENT" ? "Percentual (%)" : type === "FIXED" ? "Valor (R$)" : "Valor de referência"}
              </Label>
              <Input id="value" type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minAmount">Pedido mínimo (R$)</Label>
              <Input id="minAmount" type="number" step="0.01" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxDiscount">Desconto máximo (R$)</Label>
              <Input id="maxDiscount" type="number" step="0.01" min="0" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites e validade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usageLimit">Limite total de usos</Label>
              <Input id="usageLimit" type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Sem limite" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perUserLimit">Usos por cliente</Label>
              <Input id="perUserLimit" type="number" min="1" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Válido a partir de</Label>
              <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Expira em</Label>
              <Input id="expiresAt" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(!!v)} /> Cupom ativo
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/cupons")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar cupom
        </Button>
      </div>
    </form>
  );
}
