"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ImportResult = {
  ok: boolean;
  data?: {
    product: { id: string; slug: string; name: string; status: string };
  };
  error?: string;
};

export function ProductUrlImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<ImportResult["data"] | null>(null);

  const handleImport = async () => {
    const target = url.trim();
    if (!target) {
      toast.error("Cole o link do produto que deseja importar.");
      return;
    }
    setLoading(true);
    setImported(null);
    try {
      const res = await fetch("/api/admin/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || !data.ok || !data.data) {
        toast.error(data.error ?? "Não foi possível importar o produto.");
        return;
      }
      setImported(data.data);
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
          Cole o link de um produto de outra loja. O sistema extrai automaticamente nome, preço,
          fotos e descrição e salva como{" "}
          <span className="font-medium text-foreground">rascunho</span> — nada é publicado sem a
          sua aprovação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.mercadolivre.com.br/... / https://www.loja.com.br/produto"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImport();
            }}
          />
          <Button type="button" onClick={handleImport} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Importando..." : "Importar como rascunho"}
          </Button>
        </div>

        {imported && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{imported.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span className="font-medium text-amber-600">Rascunho</span> — não aparece na
                  loja até você publicar.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  router.push(`/admin/produtos/${imported.product.id}/previsualizar`)
                }
              >
                <ExternalLink className="size-4" /> Ver prévia da página
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}