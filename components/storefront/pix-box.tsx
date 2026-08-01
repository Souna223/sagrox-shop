"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function PixBox({ qrCode, code }: { qrCode: string | null; code: string | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.success.scanOrCopy}</p>
      {qrCode ? (
        <div className="mx-auto w-fit rounded-xl border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrCode}`}
            alt="QR Code Pix"
            className="size-44 object-contain"
            width={176}
            height={176}
          />
        </div>
      ) : null}
      {code ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <code className="flex-1 break-all px-2 font-mono text-xs leading-relaxed">{code}</code>
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? t.success.copied : t.success.copy}
          </button>
        </div>
      ) : null}
    </div>
  );
}
