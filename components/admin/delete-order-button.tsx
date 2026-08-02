"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteOrderButtonProps = {
  orderId: string;
  orderNumber: number;
};

export function DeleteOrderButton({ orderId, orderNumber }: DeleteOrderButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Remover o pedido #${orderNumber}? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao remover o pedido.");
        return;
      }
      toast.success("Pedido removido.");
      router.push("/admin/pedidos");
      router.refresh();
    } catch {
      toast.error("Erro ao remover o pedido.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={remove}
      disabled={deleting}
    >
      {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Remover pedido
    </Button>
  );
}
