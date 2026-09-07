"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Clock, XCircle, RefreshCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type Dictionary = {
  refundRequestButton: string;
  refundRequestTitle: string;
  refundRequestDescription: string;
  refundRequestReason: string;
  refundRequestReasonPlaceholder: string;
  refundRequestSend: string;
  refundRequestSending: string;
  refundRequestError: string;
  refundRequestSuccess: string;
  refundRequestPending: string;
  refundRequestPendingDescription: string;
  refundRequestRejected: string;
  refundRequestRejectedDescription: string;
  refundRequestCompleted: string;
  refundRequestCompletedDescription: string;
};

type AccountRefundRequestProps = {
  orderNumber: number;
  orderStatus: string;
  paymentStatus: string;
  refundStatus: string | null;
  t: Dictionary;
};

export function AccountRefundRequest({ orderNumber, orderStatus, paymentStatus, refundStatus, t }: AccountRefundRequestProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState("");

  const canRequestRefund =
    !success &&
    (orderStatus === "PAID" || orderStatus === "PROCESSING") &&
    paymentStatus === "APPROVED" &&
    !refundStatus;

  async function sendRefundRequest() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/orders/${orderNumber}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t.refundRequestError);
        return;
      }
      setOpen(false);
      setSuccess(true);
      setReason("");
      router.refresh();
    } catch {
      setError(t.refundRequestError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {refundStatus === "PENDING" ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{t.refundRequestPending}</p>
            <p className="mt-1 text-sm text-amber-700">{t.refundRequestPendingDescription}</p>
          </div>
        </div>
      ) : refundStatus === "REJECTED" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">{t.refundRequestRejected}</p>
            <p className="mt-1 text-sm text-red-700">{t.refundRequestRejectedDescription}</p>
          </div>
        </div>
      ) : refundStatus === "COMPLETED" ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <RefreshCcw className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">{t.refundRequestCompleted}</p>
            <p className="mt-1 text-sm text-emerald-700">{t.refundRequestCompletedDescription}</p>
          </div>
        </div>
      ) : success ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <RefreshCcw className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">{t.refundRequestSuccess}</p>
          </div>
        </div>
      ) : canRequestRefund ? (
        <div className="mt-6 rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            {t.refundRequestDescription}
          </p>
          <div className="mt-3">
            <Dialog open={open} onOpenChange={setOpen}>
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
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t.refundRequestReasonPlaceholder}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={sendRefundRequest} disabled={sending}>
                    {sending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {sending ? t.refundRequestSending : t.refundRequestSend}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : null}
    </div>
  );
}