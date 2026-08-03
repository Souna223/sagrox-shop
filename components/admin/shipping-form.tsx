"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShippingMethodConfig } from "@/lib/shipping-methods";

type MethodForm = {
  code: string;
  service: string;
  price: string;
  deliveryDays: string;
  active: boolean;
};

type ShippingFormProps = {
  methods: ShippingMethodConfig[];
  shippingEnabled: boolean;
  freeShippingThreshold: number;
};

function toForm(m: ShippingMethodConfig): MethodForm {
  return {
    code: m.code,
    service: m.service,
    price: String(m.price).replace(".", ","),
    deliveryDays: String(m.deliveryDays),
    active: m.active,
  };
}

export function ShippingForm({ methods, shippingEnabled, freeShippingThreshold }: ShippingFormProps) {
  const [enabled, setEnabled] = useState(shippingEnabled);
  const [threshold, setThreshold] = useState(String(freeShippingThreshold ?? 0));
  const [list, setList] = useState<MethodForm[]>(methods.map(toForm));
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<MethodForm>) => {
    setList((items) => items.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const addMethod = () => {
    setList((items) => [
      ...items,
      { code: "", service: "", price: "", deliveryDays: "7", active: true },
    ]);
  };

  const removeMethod = (index: number) => {
    setList((items) => items.filter((_, i) => i !== index));
  };

  const parsePrice = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methods: list.map((m) => ({
            code: m.code,
            service: m.service,
            price: m.price === "" ? 0 : parsePrice(m.price),
            deliveryDays: Number(m.deliveryDays) || 1,
            active: m.active,
          })),
          shippingEnabled: enabled,
          freeShippingThreshold: threshold === "" ? 0 : parsePrice(threshold),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar o frete.");
        return;
      }
      toast.success("Configurações de frete salvas!");
    } catch {
      toast.error("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Truck className="size-6 text-primary" /> Frete
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure os métodos de envio exibidos no checkout.
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar frete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de envio</CardTitle>
          <CardDescription>Ative o frete e defina a regra de frete grátis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={enabled}
              onCheckedChange={(v) => setEnabled(!!v)}
            />
            Habilitar frete para entrega
          </label>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="freeShippingThreshold">Frete grátis a partir de (R$)</Label>
            <Input
              id="freeShippingThreshold"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="0 para desativar"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métodos de envio</CardTitle>
          <CardDescription>
            Estes métodos aparecem no checkout. Deixe o preço em R$ 0 para frete grátis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum método cadastrado. Quando o frete está habilitado sem métodos, o checkout oferece retirada na loja.
            </p>
          ) : null}
          {list.map((m, index) => (
            <div key={index} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Método {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeMethod(index)}
                  aria-label="Remover método"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label>Nome exibido</Label>
                  <Input
                    value={m.service}
                    onChange={(e) => update(index, { service: e.target.value })}
                    placeholder="Ex.: SEDEX - Expresso"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Código</Label>
                  <Input
                    value={m.code}
                    onChange={(e) => update(index, { code: e.target.value })}
                    placeholder="Ex.: SEDEX"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Preço (R$)</Label>
                  <Input
                    value={m.price}
                    onChange={(e) => update(index, { price: e.target.value.replace(/[^\d,.]/g, "") })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Prazo (dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={m.deliveryDays}
                    onChange={(e) => update(index, { deliveryDays: e.target.value })}
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={m.active}
                  onCheckedChange={(checked) => update(index, { active: !!checked })}
                />
                Método ativo
              </label>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addMethod}>
            <Plus className="size-4" /> Adicionar método
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
