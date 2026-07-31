"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS, ORDER_STATUS_STYLES, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type OrderStatusControlProps = {
  orderId: string;
  currentStatus: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
};

export function OrderStatusControl({
  orderId,
  currentStatus,
  trackingCode,
  trackingUrl,
}: OrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(currentStatus);
  const [cancelledReason, setCancelledReason] = useState("");
  const [code, setCode] = useState(trackingCode ?? "");
  const [url, setUrl] = useState(trackingUrl ?? "");
  const [saving, setSaving] = useState(false);

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus as keyof typeof ORDER_STATUS_TRANSITIONS] ?? [];
  const isTerminal = currentStatus === "CANCELLED" || currentStatus === "REFUNDED";

  const save = async () => {
    if (status === currentStatus && code === (trackingCode ?? "") && url === (trackingUrl ?? "")) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    if (status === "CANCELLED" && !cancelledReason.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cancelledReason: cancelledReason || null,
          trackingCode: code || null,
          trackingUrl: url || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao atualizar o pedido.");
        return;
      }
      toast.success("Pedido atualizado.");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar o pedido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              ORDER_STATUS_STYLES[currentStatus as keyof typeof ORDER_STATUS_STYLES] ?? "bg-muted text-muted-foreground",
            )}
          >
            {ORDER_STATUS[currentStatus as keyof typeof ORDER_STATUS] ?? currentStatus}
          </span>
        </div>
        {!isTerminal ? (
          <span className="text-xs text-muted-foreground">
            {allowed.length} transição{allowed.length === 1 ? "" : "ões"} possíve{allowed.length === 1 ? "l" : "is"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Status final — sem novas transições.</span>
        )}
      </div>

      {!isTerminal ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Novo status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v ?? currentStatus)}
              items={[
                { label: ORDER_STATUS[currentStatus as keyof typeof ORDER_STATUS] ?? currentStatus, value: currentStatus },
                ...allowed.map((s) => ({
                  label: ORDER_STATUS[s as keyof typeof ORDER_STATUS] ?? s,
                  value: s,
                })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{ORDER_STATUS[status as keyof typeof ORDER_STATUS] ?? status}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus}>
                  {ORDER_STATUS[currentStatus as keyof typeof ORDER_STATUS] ?? currentStatus} (atual)
                </SelectItem>
                {allowed.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS[s as keyof typeof ORDER_STATUS] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === "CANCELLED" ? (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
              <Textarea
                id="cancel-reason"
                value={cancelledReason}
                onChange={(e) => setCancelledReason(e.target.value)}
                placeholder="Ex.: cliente solicitou cancelamento"
                rows={2}
              />
            </div>
          ) : null}

          {status === "SHIPPED" || currentStatus === "SHIPPED" || currentStatus === "DELIVERED" || currentStatus === "COMPLETED" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tracking-code">Código de rastreio</Label>
                <Input
                  id="tracking-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex.: BR1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking-url">Link de rastreio</Label>
                <Input
                  id="tracking-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://... (opcional)"
                />
              </div>
            </div>
          ) : null}

          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      ) : currentStatus === "CANCELLED" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Pedido cancelado. O estoque reservado foi liberado.
        </p>
      ) : null}
    </div>
  );
}
