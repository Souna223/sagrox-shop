"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RefundRequestReviewProps = {
  orderId: string;
  orderNumber: number;
  reason: string | null;
};

export function RefundRequestReview({ orderId, orderNumber, reason }: RefundRequestReviewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);

  const decide = async (action: "accept" | "reject") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao processar solicitação.");
        return;
      }
      toast.success(action === "accept" ? "Reembolso aprovado e processado." : "Solicitação recusada.");
      router.refresh();
    } catch {
      toast.error("Erro ao processar solicitação.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-5">
      <div className="flex items-center gap-2">
        <RefreshCcw className="size-4 text-purple-700" />
        <p className="font-semibold text-purple-900">Solicitação de reembolso — Pedido #{orderNumber}</p>
      </div>
      {reason ? (
        <p className="mt-2 text-sm text-purple-800">
          <span className="font-medium">Motivo:</span> {reason}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-purple-700">
        O cliente solicitou o reembolso. Aprovar processa a devolução via gateway e restaura o estoque.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button disabled={busy !== null}>
              {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Aprovar reembolso
            </Button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <CheckCircle2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Aprovar reembolso</AlertDialogTitle>
              <AlertDialogDescription>
                O valor de <strong>#{orderNumber}</strong> será devolvido ao cliente e o estoque restaurado. Essa ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => decide("accept")} disabled={busy !== null}>
                {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger render={
            <Button variant="outline" disabled={busy !== null}>
              {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Recusar solicitação
            </Button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <XCircle className="text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Recusar reembolso</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido #{orderNumber} voltará para o status anterior e o cliente será informado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => decide("reject")} disabled={busy !== null}>
                {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : null}
                Recusar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}