"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/provider";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t.auth.sendLinkError);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40">
        <p className="font-medium">{t.auth.linkSentTitle}</p>
        <p className="mt-1 text-emerald-700 dark:text-emerald-300">
          {t.auth.linkSentDesc}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t.auth.forgotPasswordInfo}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.emailPlaceholder}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {t.auth.sendLink}
      </Button>
    </form>
  );
}
