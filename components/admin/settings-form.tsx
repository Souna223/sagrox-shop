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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SettingValues } from "@/lib/admin-settings";

type SettingsFormProps = {
  initial: SettingValues;
};

const str = (v: string | number | boolean | undefined): string =>
  v === undefined ? "" : String(v);

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SettingValues>(initial);
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...values };
      payload.freeShippingThreshold = Number(payload.freeShippingThreshold ?? 0);
      payload.shippingEnabled = !!payload.shippingEnabled;

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao salvar as configurações.");
        return;
      }
      toast.success("Configurações salvas!");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
          <CardDescription>Identidade e exibição da loja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Nome da loja *</Label>
              <Input id="storeName" value={str(values.storeName)} onChange={(e) => set("storeName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Moeda</Label>
              <Input id="currency" value={str(values.currency)} onChange={(e) => set("currency", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storeDescription">Descrição da loja</Label>
            <Textarea id="storeDescription" value={str(values.storeDescription)} onChange={(e) => set("storeDescription", e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <Select
              value={str(values.theme) || "light"}
              onValueChange={(v) => set("theme", v ?? "light")}
              items={[
                { label: "Claro", value: "light" },
                { label: "Escuro", value: "dark" },
              ]}
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue className="pr-6">{str(values.theme) === "dark" ? "Escuro" : "Claro"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato e redes sociais</CardTitle>
          <CardDescription>Exibidos no rodapé da loja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={str(values.whatsapp)} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={str(values.phone)} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={str(values.email)} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessHours">Horário de funcionamento</Label>
              <Input id="businessHours" value={str(values.businessHours)} onChange={(e) => set("businessHours", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={str(values.address)} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={str(values.instagram)} onChange={(e) => set("instagram", e.target.value)} placeholder="@sualoja" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook">Facebook</Label>
              <Input id="facebook" value={str(values.facebook)} onChange={(e) => set("facebook", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input id="tiktok" value={str(values.tiktok)} onChange={(e) => set("tiktok", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frete e pagamentos</CardTitle>
          <CardDescription>Regras de envio e integração de pagamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="freeShippingThreshold">Frete grátis a partir de (R$)</Label>
              <Input
                id="freeShippingThreshold"
                type="number"
                min="0"
                step="0.01"
                value={str(values.freeShippingThreshold)}
                onChange={(e) => set("freeShippingThreshold", e.target.value)}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={Boolean(values.shippingEnabled)}
                  onCheckedChange={(v) => set("shippingEnabled", !!v)}
                />
                Frete habilitado
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appmaxPublicKey">Chave pública Appmax</Label>
            <Input id="appmaxPublicKey" value={str(values.appmaxPublicKey)} onChange={(e) => set("appmaxPublicKey", e.target.value)} placeholder="pk_..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anúncio</CardTitle>
          <CardDescription>Mensagem fixa exibida na barra superior da loja (em segundo plano do módulo de anúncios).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="announcement">Mensagem</Label>
            <Input id="announcement" value={str(values.announcement)} onChange={(e) => set("announcement", e.target.value)} placeholder="Ex.: Frete grátis acima de R$ 299" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
