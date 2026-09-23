"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Globe, Loader2, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportResult = {
  ok: boolean;
  needsPrice?: boolean;
  product?: { id: string; slug: string; name: string; status: string };
  data?: {
    name?: string;
    description?: string;
    images?: string[];
  };
  message?: string;
  error?: string;
};

export function ProductUrlImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<ImportResult["product"] | null>(null);
  const [pending, setPending] = useState<NonNullable<ImportResult["data"]> | null>(null);
  const [needsPrice, setNeedsPrice] = useState(false);
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");

  const handleImport = async (manualPrice?: string, manualCompare?: string) => {
    const target = url.trim();
    if (!target) {
      toast.error("Cole o link do produto que deseja importar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target,
          ...(manualPrice ? { price: manualPrice } : {}),
          ...(manualCompare ? { compareAtPrice: manualCompare } : {}),
        }),
      });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? data.message ?? "Não foi possível importar o produto.");
        return;
      }
      if (data.needsPrice && data.data) {
        setNeedsPrice(true);
        setPending(data.data);
        setImported(null);
        toast.info("Informe o preço para finalizar a importação.");
        return;
      }
      setNeedsPrice(false);
      setPending(null);
      setImported(data.product ?? null);
      toast.success("Produto importado como rascunho.");
    } catch {
      toast.error("Falha ao importar o produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4" /> Importar por link
        </CardTitle>
        <CardDescription>
          Cole o link de um produto de outra loja. O sistema extrai automaticamente nome, fotos e
          descrição e salva como <span className="font-medium text-foreground">rascunho</span> — nada
          é publicado sem a sua aprovação. Se o preço não for detectado, você o informa na hora.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setNeedsPrice(false);
              setPending(null);
              setImported(null);
            }}
            placeholder="https://www.mercadolivre.com.br/... / https://www.loja.com.br/produto"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImport();
            }}
          />
          <Button type="button" onClick={() => handleImport()} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Importando..." : "Importar como rascunho"}
          </Button>
        </div>

        {needsPrice && pending ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {pending.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pending.images[0]}
                  alt=""
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="line-clamp-2 text-sm font-medium">{pending.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="size-3" /> Preço não detectado no link. Informe abaixo.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-price">Preço (R$)</Label>
                    <Input
                      id="manual-price"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="ex.: 49,90"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-compare">Preço de (opcional, R$)</Label>
                    <Input
                      id="manual-compare"
                      inputMode="decimal"
                      value={compareAt}
                      onChange={(e) => setCompareAt(e.target.value)}
                      placeholder="ex.: 69,90"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => handleImport(price, compareAt)}
                    disabled={loading || !price.trim()}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Importar com este preço
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNeedsPrice(false);
                      setPending(null);
                      setImported(null);
                      setPrice("");
                      setCompareAt("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {imported ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{imported.name}</p>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span className="font-medium text-amber-600">Rascunho</span> — não aparece na
                  loja até você publicar.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (imported) router.push(`/admin/produtos/${imported.id}/previsualizar`);
                }}
              >
                <ExternalLink className="size-4" /> Ver prévia da página
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}