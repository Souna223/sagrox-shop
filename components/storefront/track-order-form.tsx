"use client";

import { useState } from "react";
import {
  Loader2,
  PackageSearch,
  AlertCircle,
  MapPin,
  CalendarDays,
  Truck,
  ExternalLink,
  RefreshCcw,
  Clock,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ORDER_STATUS_STYLES } from "@/lib/constants";
import { formatBRL } from "@/lib/format";

type Dictionary = {
  trackOrderNumber: string;
  trackOrderNumberPlaceholder: string;
  trackOrderEmail: string;
  trackOrderEmailPlaceholder: string;
  trackOrderButton: string;
  trackOrderSearching: string;
  trackOrderNotFound: string;
  trackOrderError: string;
  trackOrderSection: string;
  trackOrderStatus: string;
  trackOrderTracking: string;
  trackOrderTrackNow: string;
  trackOrderItems: string;
  trackOrderTotal: string;
  trackOrderDate: string;
  trackOrderShipping: string;
  refundRequestButton: string;
  refundRequestTitle: string;
  refundRequestDescription: string;
  refundRequestReason: string;
  refundRequestReasonPlaceholder: string;
  refundRequestSend: string;
  refundRequestSending: string;
  refundRequestSuccess: string;
  refundRequestPending: string;
  refundRequestPendingDescription: string;
  refundRequestRejected: string;
  refundRequestRejectedDescription: string;
  refundRequestNotFound: string;
  refundRequestError: string;
};

type RefundRequest = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
};

type TrackedOrder = {
  number: number;
  status: keyof typeof ORDER_STATUS_STYLES;
  statusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  paymentMethodLabel: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  shippingService: string | null;
  shippingEstimateDays: number | null;
  createdAt: string;
  shippedAt: string | null;
  total: string;
  refundRequest: RefundRequest | null;
  items: { name: string; sku: string; imageUrl: string | null; quantity: number; unitPrice: string }[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function TrackOrderForm({ t }: { t: Dictionary }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [email, setEmail] = useState("");
  const [refundOpts, setRefundOpts] = useState({ open: false, sending: false, reason: "" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOrder(null);

    const form = new FormData(e.currentTarget);
    const body = {
      number: String(form.get("number") ?? ""),
      email: String(form.get("email") ?? ""),
    };
    setEmail(String(form.get("email") ?? ""));

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t.trackOrderError);
        return;
      }
      setOrder(data.data as TrackedOrder);
    } catch {
      setError(t.trackOrderError);
    } finally {
      setPending(false);
    }
  }

  const statusStyle = order ? ORDER_STATUS_STYLES[order.status] : "";
  const canRequestRefund =
    order &&
    !order.refundRequest &&
    (order.status === "PAID" || order.status === "PROCESSING") &&
    order.paymentStatus === "APPROVED";

  async function sendRefundRequest() {
    if (!order) return;
    setRefundOpts((s) => ({ ...s, sending: true }));
    try {
      const res = await fetch("/api/orders/track/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: order.number,
          email,
          reason: refundOpts.reason.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t.refundRequestError);
        return;
      }
      setRefundOpts({ open: false, sending: false, reason: "" });
      setError(null);
      // refresh order to show pending state
      const refreshed = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: order.number, email }),
      });
      const refreshedData = await refreshed.json().catch(() => null);
      if (refreshed.ok && refreshedData?.ok) {
        setOrder(refreshedData.data as TrackedOrder);
      }
    } catch {
      setError(t.refundRequestError);
    } finally {
      setRefundOpts((s) => ({ ...s, sending: false }));
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border bg-card p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-2">
          <Label htmlFor="track-number">{t.trackOrderNumber}</Label>
          <Input
            id="track-number"
            name="number"
            type="text"
            inputMode="numeric"
            required
            placeholder={t.trackOrderNumberPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="track-email">{t.trackOrderEmail}</Label>
          <Input
            id="track-email"
            name="email"
            type="email"
            required
            placeholder={t.trackOrderEmailPlaceholder}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageSearch className="size-4" />}
            {pending ? t.trackOrderSearching : t.trackOrderButton}
          </Button>
        </div>
      </form>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {order ? (
        <section className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <h2 className="text-xl font-bold tracking-tight">
              {t.trackOrderSection} #{order.number}
            </h2>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}>
              {order.statusLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{t.trackOrderDate}</div>
                <div className="text-sm font-medium">{formatDate(order.createdAt)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{t.trackOrderShipping}</div>
                <div className="text-sm font-medium">
                  {order.shippingService ?? order.paymentMethodLabel ?? "—"}
                  {order.shippingEstimateDays
                    ? ` · ${order.shippingEstimateDays} dia${order.shippingEstimateDays > 1 ? "s" : ""} útil${order.shippingEstimateDays > 1 ? "eis" : ""}`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{t.trackOrderStatus}</div>
                <div className="text-sm font-medium">{order.paymentStatusLabel}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <PackageSearch className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{t.trackOrderTotal}</div>
                <div className="text-sm font-semibold">{formatBRL(Number(order.total))}</div>
              </div>
            </div>
          </div>

          {order.trackingCode ? (
            <div className="mt-6 rounded-xl bg-muted/50 p-5">
              <div className="text-xs text-muted-foreground">{t.trackOrderTracking}</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-wide">{order.trackingCode}</div>
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t.trackOrderTrackNow}
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          ) : null}

          {order.refundRequest ? (
            order.refundRequest.status === "PENDING" ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t.refundRequestPending}</p>
                  <p className="mt-1 text-sm text-amber-700">{t.refundRequestPendingDescription}</p>
                </div>
              </div>
            ) : order.refundRequest.status === "REJECTED" ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
                <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{t.refundRequestRejected}</p>
                  <p className="mt-1 text-sm text-red-700">{t.refundRequestRejectedDescription}</p>
                </div>
              </div>
            ) : null
          ) : canRequestRefund ? (
            <div className="mt-6 rounded-xl border p-5">
              <p className="text-sm text-muted-foreground">
                Não está satisfeito(a)? Você pode solicitar o reembolso deste pedido diretamente aqui.
              </p>
              <div className="mt-3">
                <Dialog open={refundOpts.open} onOpenChange={(open) => setRefundOpts((s) => ({ ...s, open }))}>
                  <DialogTrigger render={
                    <Button variant="outline">
                      <RefreshCcw className="size-4" />
                      {t.refundRequestButton}
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <RefreshCcw className="size-4" /> {t.refundRequestTitle}
                      </DialogTitle>
                      <DialogDescription>{t.refundRequestDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="refund-reason">{t.refundRequestReason}</Label>
                      <Textarea
                        id="refund-reason"
                        rows={3}
                        value={refundOpts.reason}
                        onChange={(e) => setRefundOpts((s) => ({ ...s, reason: e.target.value }))}
                        placeholder={t.refundRequestReasonPlaceholder}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={sendRefundRequest} disabled={refundOpts.sending}>
                        {refundOpts.sending ? <Loader2 className="size-4 animate-spin" /> : null}
                        {refundOpts.sending ? t.refundRequestSending : t.refundRequestSend}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground">{t.trackOrderItems}</h3>
            <ul className="mt-3 divide-y">
              {order.items.map((item, index) => (
                <li key={index} className="flex items-center gap-4 py-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-14 rounded-lg border bg-muted object-cover"
                    />
                  ) : (
                    <div className="size-14 rounded-lg border bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x {formatBRL(Number(item.unitPrice))}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatBRL(Number(item.unitPrice) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
