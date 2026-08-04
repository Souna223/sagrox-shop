"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TEMPLATE_HEADERS = ["sku", "email", "name", "rating", "title", "comment", "status", "date"];

const TEMPLATE_SEP = ";";

const TEMPLATE_ROW = [
  "SKU-001",
  "cliente@exemplo.com.br",
  "João Silva",
  "5",
  "Excelente produto",
  "Chegou rápido e veio perfeito.",
  "APPROVED",
  "2026-01-15",
].join(TEMPLATE_SEP);

const ACCEPTED_COLUMNS = [
  ["sku", "SKU do produto (identifica o produto)"],
  ["slug", "Slug do produto (alternativa ao SKU)"],
  ["product", "Nome do produto (usado se não houver SKU/slug)"],
  ["email", "E-mail do cliente (opcional — se ausente, uma conta fake é gerada automaticamente)"],
  ["name", "Nome do cliente (aparece na avaliação)"],
  ["rating", "Nota de 1 a 5 (obrigatória)"],
  ["title", "Título da avaliação"],
  ["comment", "Comentário da avaliação"],
  ["status", "APPROVED | PENDING | REJECTED (padrão: APPROVED)"],
  ["date", "Data da avaliação — ex.: 2026-01-15 ou 15/01/2026"],
] as const;

type ImportResult = {
  ok: boolean;
  data?: {
    total: number;
    created: number;
    errors: number;
    usersCreated: number;
    issues: { row: number; name: string; error: string }[];
  };
  error?: string;
};

export default function ReviewImportForm() {
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
    a.download = "modelo-avaliacoes.csv";
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
      const res = await fetch("/api/admin/import-reviews", { method: "POST", body: fd });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || !data.ok || !data.data) {
        toast.error(data.error ?? "Não foi possível importar o CSV.");
        return;
      }
      setResult(data.data);
      if (data.data.created > 0) {
        toast.success(`${data.data.created} avaliação(ões) importada(s).`);
        router.refresh();
      } else {
        toast.error("Nenhuma avaliação foi importada. Verifique os erros.");
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
          <CardTitle>Importar avaliações via CSV</CardTitle>
          <CardDescription>
            Baixe o modelo, preencha com as avaliações e envie o arquivo. Produtos são identificados por SKU, slug ou nome.
            O e-mail é opcional: se não houver coluna de e-mail (caso das exportações do AliExpress), é gerada uma conta fake
            automaticamente e o nome do cliente é usado na avaliação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" /> Baixar modelo CSV
            </Button>
            <Button type="button" disabled={loading} onClick={() => fileRef.current?.click()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
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
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{col}</code>
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
              {result.created} de {result.total} avaliação(ões) importada(s)
              {result.usersCreated > 0 ? ` · ${result.usersCreated} cliente(s) criado(s)` : ""}
              {result.errors > 0 ? ` · ${result.errors} erro(s)` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
