"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Import, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportedProduct = {
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  description: string;
  source: string;
};

export default function ProductImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<ImportedProduct | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Informe a URL do produto.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as { ok: boolean; data?: ImportedProduct; error?: string };
      if (!res.ok || !data.ok || !data.data) {
        toast.error(data.error ?? "Não foi possível importar o produto.");
        return;
      }
      setImported(data.data);
      setImages(data.data.images);
    } catch {
      toast.error("Falha ao importar o produto.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!imported) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: imported.name,
          price: imported.price,
          compareAtPrice: imported.compareAtPrice,
          description: imported.description,
          shortDescription: imported.description.slice(0, 150),
          images,
          stock: 0,
          status: "DRAFT",
          visibility: "VISIBLE",
        }),
      });
      const data = (await res.json()) as { ok: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Não foi possível criar o produto.");
        return;
      }
      toast.success("Produto importado como rascunho!");
      router.push(`/admin/produtos/${data.data?.id}/editar`);
    } catch {
      toast.error("Falha ao criar o produto.");
    } finally {
      setCreating(false);
    }
  };

  const removeImage = (i: number) =>
    setImages((list) => list.filter((_, index) => index !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar produto de outra loja</CardTitle>
        <CardDescription>
          Cole o link de um produto de qualquer loja (Amazon, Shopee, Mercado Livre, sites de
          nicho etc.). Vamos extrair nome, preço, fotos e descrição automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.exemplo.com.br/produto/123"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImport();
            }}
          />
          <Button onClick={handleImport} disabled={loading || creating}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Import className="size-4" />}
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {imported && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="flex flex-col gap-2">
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt={imported.name}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-md border text-muted-foreground">
                    Sem foto
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{imported.name}</div>
                <div className="text-lg font-semibold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(imported.price)}
                  {imported.compareAtPrice && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(imported.compareAtPrice)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{imported.source}</p>
                <p className="line-clamp-3 text-sm text-muted-foreground">{imported.description}</p>
              </div>
            </div>

            <div>
              <Label>Fotos ({images.length})</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={img} className="group relative">
                    <img
                      src={img}
                      alt={`Foto ${i + 1}`}
                      className="size-16 rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreate} disabled={loading || creating}>
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {creating ? "Criando..." : "Criar produto como rascunho"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setImported(null)}
                disabled={creating}
              >
                <Trash2 className="size-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
