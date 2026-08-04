"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileUp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TEMPLATE_HEADERS = [
  "name",
  "sku",
  "price",
  "compareAtPrice",
  "stock",
  "description",
  "shortDescription",
  "images",
  "tags",
  "brand",
  "category",
  "status",
  "visibility",
];

const TEMPLATE_SEP = ";";

const TEMPLATE_ROW = [
  "Produto Exemplo",
  "SKU-001",
  "49.90",
  "69.90",
  "10",
  "Descrição completa do produto",
  "Descrição curta",
  "https://exemplo.com.br/foto1.jpg|https://exemplo.com.br/foto2.jpg",
  "oferta|novo",
  "Marca",
  "Electrônicos",
  "ACTIVE",
  "VISIBLE",
].join(TEMPLATE_SEP);

const ACCEPTED_COLUMNS = [
  ["name", "Nome do produto (obrigatório)"],
  ["sku", "Código/SKU (se vazio, gerado automaticamente)"],
  ["price", "Preço (obrigatório) — ex.: 49.90 ou 49,90"],
  ["compareAtPrice", "Preço de (de/por)"],
  ["stock", "Estoque"],
  ["description", "Descrição completa"],
  ["shortDescription", "Descrição curta"],
  ["images", "Fotos: URLs separadas por | ou ;"],
  ["tags", "Tags separadas por | ou ;"],
  ["brand", "Marca (precisa já existir no cadastro)"],
  ["category", "Categoria (precisa já existir no cadastro)"],
  ["status", "DRAFT | ACTIVE | INACTIVE (padrão: ACTIVE)"],
  ["visibility", "VISIBLE | HIDDEN (padrão: VISIBLE)"],
] as const;

type ImportResult = {
  ok: boolean;
  data?: {
    total: number;
    created: number;
    errors: number;
    issues: { row: number; name: string; error: string }[];
  };
  error?: string;
};

export default function ProductImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult["data"] | null>(null);

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(TEMPLATE_SEP), TEMPLATE_ROW].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Envie um arquivo no formato .csv.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import-csv", { method: "POST", body: fd });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || !data.ok || !data.data) {
        toast.error(data.error ?? "Não foi possível importar o CSV.");
        return;
      }
      setResult(data.data);
      if (data.data.created > 0) {
        toast.success(`${data.data.created} produto(s) importado(s).`);
      } else {
        toast.error("Nenhum produto foi importado. Verifique os erros.");
      }
    } catch {
      toast.error("Falha ao importar o CSV.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar produtos via CSV</CardTitle>
          <CardDescription>
            Baixe o modelo, preencha com seus produtos e envie o arquivo. O sistema aceita CSV com
            vírgula ou ponto e vírgula (Excel pt-BR) e detecta a codificação automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" /> Baixar modelo CSV
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              {loading ? "Importando..." : "Selecionar arquivo CSV"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colunas aceitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {ACCEPTED_COLUMNS.map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {col}
                </code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da importação</CardTitle>
            <CardDescription>
              {result.created} de {result.total} produto(s) criado(s)
              {result.errors > 0 ? ` · ${result.errors} erro(s)` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.created > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => router.push("/admin/produtos")}
                >
                  <Plus className="size-4" /> Ver produtos
                </Button>
              </div>
            )}
            {result.issues.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2 font-medium">Linha</th>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 font-medium">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.issues.map((issue) => (
                      <tr key={issue.row} className="border-b last:border-0">
                        <td className="px-3 py-2">{issue.row}</td>
                        <td className="px-3 py-2">{issue.name || "—"}</td>
                        <td className="px-3 py-2 text-destructive">{issue.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
