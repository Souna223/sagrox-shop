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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
};

type TrackedOrder = {
  number: number;
  status: keyof typeof ORDER_STATUS_STYLES;
  statusLabel: string;
  paymentStatusLabel: string;
  paymentMethodLabel: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  shippingService: string | null;
  shippingEstimateDays: number | null;
  createdAt: string;
  shippedAt: string | null;
  total: string;
  items: { name: string; sku: string; imageUrl: string | null; quantity: number; unitPrice: string }[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function TrackOrderForm({ t }: { t: Dictionary }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

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
