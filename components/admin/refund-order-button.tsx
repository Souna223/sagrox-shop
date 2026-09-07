"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw, Loader2 } from "lucide-react";
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

type RefundOrderButtonProps = {
  orderId: string;
  orderNumber: number;
};

export function RefundOrderButton({ orderId, orderNumber }: RefundOrderButtonProps) {
  const router = useRouter();
  const [refunding, setRefunding] = useState(false);

  const refund = async () => {
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao solicitar reembolso.");
        return;
      }
      toast.success(`Reembolso solicitado para o pedido #${orderNumber}.`);
      router.refresh();
    } catch {
      toast.error("Erro ao solicitar reembolso.");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={refunding}>
        {refunding ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
        Reembolsar pedido
      </Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RefreshCcw />
          </AlertDialogMedia>
          <AlertDialogTitle>Confirmar reembolso</AlertDialogTitle>
          <AlertDialogDescription>
            Solicitar o reembolso do pedido #{orderNumber}? O valor será devolvido ao cliente e o estoque
            será restaurado. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={refund}
            disabled={refunding}
          >
            {refunding ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar reembolso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}