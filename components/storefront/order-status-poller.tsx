"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PixBox } from "@/components/storefront/pix-box";
import { PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import type { PaymentStatus, PaymentMethod, OrderStatus } from "@/generated/prisma/enums";

type StatusData = {
  orderStatus: string;
  orderStatusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  pixQrCode: string | null;
  pixCode: string | null;
  boletoUrl: string | null;
  boletoBarcode: string | null;
};

const TERMINAL_STATUSES = new Set(["APPROVED", "CANCELLED", "REFUNDED", "FAILED"]);
const POLL_INTERVAL = 3000;
const MAX_POLLS = 120; // 6 minutes max

type Props = {
  orderNumber: number;
  initial: StatusData;
};

export function OrderStatusPoller({ orderNumber, initial }: Props) {
  const [data, setData] = useState<StatusData>(initial);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(initial.paymentStatus)) return;

    timerRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/orders/status?number=${orderNumber}`);
        if (!res.ok) return;
        const json = (await res.json()) as StatusData;
        setData(json);
        if (TERMINAL_STATUSES.has(json.paymentStatus)) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // retry on next interval
      }
    }, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderNumber, initial.paymentStatus]);

  const isApproved = data.paymentStatus === "APPROVED";
  const isFailed =
    data.paymentStatus === "CANCELLED" || data.paymentStatus === "REFUNDED" || data.paymentStatus === "FAILED";
  const isPending = data.paymentStatus === "PENDING";
  const isProcessing = data.paymentStatus === "PROCESSING";

  return (
    <div className="space-y-3">
      {/* Status badge */}
      {isApproved && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Pagamento confirmado!
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="size-4" />
          Pagamento não confirmado.
        </div>
      )}
      {isPending && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <Loader2 className="size-4 animate-spin" />
          Aguardando pagamento...
        </div>
      )}
      {isProcessing && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          <Loader2 className="size-4 animate-spin" />
          Processando pagamento...
        </div>
      )}

      {/* Pix QR code (shown when available, updates when payment is approved) */}
      {data.paymentMethod === "PIX" && (
        <div className="space-y-3">
          {!isApproved && (
            <PixBox qrCode={data.pixQrCode} code={data.pixCode} />
          )}
        </div>
      )}

      {/* Boleto link */}
      {data.paymentMethod === "BOLETO" && data.boletoUrl && !isApproved && (
        <a
          href={data.boletoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          📄 Baixar boleto
        </a>
      )}

      {/* Status text */}
      <p className="text-sm text-muted-foreground">
        Status: <strong>{data.paymentStatusLabel}</strong>
      </p>
    </div>
  );
}
