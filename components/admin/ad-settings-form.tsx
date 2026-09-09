"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Eye, EyeOff, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdsSettings } from "@/lib/ads";

type AdSettingsFormProps = {
  platform: "meta" | "tiktok";
  platformLabel: string;
  initial: AdsSettings;
};

export function AdSettingsForm({ platform, platformLabel, initial }: AdSettingsFormProps) {
  const [values, setValues] = useState<AdsSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const prefix = platform === "meta" ? "meta" : "tiktok";

  const set = (suffix: string, value: string) => {
    const key = `${prefix}${suffix}` as keyof AdsSettings;
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      payload[`${prefix}PixelId`] = values[`${prefix}PixelId` as keyof AdsSettings];
      payload[`${prefix}AccessToken`] = values[`${prefix}AccessToken` as keyof AdsSettings];
      payload[`${prefix}TestEventCode`] = values[`${prefix}TestEventCode` as keyof AdsSettings];

      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; data?: AdsSettings };
      if (!res.ok || !data.ok || !data.data) {
        toast.error(data.error ?? "Erro ao salvar os anúncios.");
        return;
      }
      setValues(data.data);
      toast.success(`${platformLabel} salvo com sucesso!`);
    } catch {
      toast.error("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{platformLabel}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure o rastreamento de anúncios do {platformLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/ads-${prefix}/analiticas`}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            <BarChart3 className="size-4" />
            Analíticas
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pixel</CardTitle>
          <CardDescription>ID do pixel instalado no site para rastreamento de visitas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}PixelId`}>
              {platform === "meta" ? "Pixel ID (Meta)" : "Pixel ID (TikTok)"}
            </Label>
            <Input
              id={`${prefix}PixelId`}
              value={values[`${prefix}PixelId` as keyof AdsSettings]}
              onChange={(e) => set("PixelId", e.target.value)}
              placeholder={platform === "meta" ? "Ex.: 1234567890123456" : "Ex.: C9ABC1D2E3F4G5H6I7J8K9L0"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversões (server-side)</CardTitle>
          <CardDescription>
            Token de acesso da API de conversões para registrar eventos (carrinho, checkout e compra) no servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}AccessToken`}>Access Token</Label>
            <div className="relative">
              <Input
                id={`${prefix}AccessToken`}
                type={showToken ? "text" : "password"}
                value={values[`${prefix}AccessToken` as keyof AdsSettings]}
                onChange={(e) => set("AccessToken", e.target.value)}
                placeholder="Cole o token de acesso aqui"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showToken ? "Ocultar token" : "Mostrar token"}
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}TestEventCode`}>Código de evento de teste (opcional)</Label>
            <Input
              id={`${prefix}TestEventCode`}
              value={values[`${prefix}TestEventCode` as keyof AdsSettings]}
              onChange={(e) => set("TestEventCode", e.target.value)}
              placeholder="Somente para testar eventos"
            />
            <p className="text-xs text-muted-foreground">
              Preencha apenas durante os testes; deixe vazio em produção.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}