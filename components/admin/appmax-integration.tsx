"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AppmaxStatus = {
  configured: boolean;
  enabled: boolean;
  installed: boolean;
  externalKey: string | null;
  merchantClientId: string | null;
};

export function AppmaxIntegration() {
  const [status, setStatus] = useState<AppmaxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/appmax");
        const json = (await res.json()) as { ok: boolean; data?: AppmaxStatus; error?: string };
        if (cancelled) return;
        if (res.ok && json.ok) setStatus(json.data ?? null);
        else toast.error(json.error ?? "Erro ao consultar o AppMax.");
      } catch {
        if (!cancelled) toast.error("Erro ao consultar o AppMax.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startInstall = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/admin/appmax", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; data?: { redirectUrl: string }; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        toast.error(json.error ?? "Erro ao iniciar a instalação.");
        return;
      }
      window.open(json.data.redirectUrl, "_blank", "noopener,noreferrer");
      toast.info("Autorize a instalação no AppMax (nova aba). Após concluir, atualize esta página.");
    } catch {
      toast.error("Erro ao iniciar a instalação.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4" />
          AppMax
        </CardTitle>
        <CardDescription>Status da integração de pagamentos (Pix, cartão, boleto).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Consultando status…
          </div>
        ) : !status?.configured ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              AppMax não está configurado. Defina as variáveis de ambiente{" "}
              <code>APPMAX_CLIENT_ID</code>, <code>APPMAX_CLIENT_SECRET</code>,{" "}
              <code>APPMAX_APP_ID_UUID</code> e <code>APPMAX_APP_ID_NUMERIC</code>.
            </div>
          </div>
        ) : status.installed ? (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium">Instalado e pronto para receber pagamentos.</p>
              <p className="mt-1 text-muted-foreground">
                external_key: <code>{status.externalKey ?? "-"}</code> · merchant client:{" "}
                <code>{status.merchantClientId ?? "-"}</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">Configurado, mas ainda não instalado.</p>
              <p className="mt-1 text-muted-foreground">
                O AppMax exige credenciais de merchant (geradas após autorizar a instalação) para
                processar pagamentos.
              </p>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={startInstall}
          disabled={loading || starting || !status?.configured}
          variant={status?.installed ? "outline" : "default"}
        >
          {starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {status?.installed ? "Reinstalar" : "Autorizar instalação no AppMax"}
        </Button>
      </CardContent>
    </Card>
  );
}
