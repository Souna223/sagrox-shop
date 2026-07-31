"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/provider";

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t.auth.passwordMin);
      return;
    }
    if (password !== confirm) {
      toast.error(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t.auth.resetPasswordError);
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <p className="font-semibold">{t.auth.passwordResetTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.passwordResetDesc}</p>
        </div>
        <Button render={<Link href="/login" />}>{t.auth.goToLogin}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{t.auth.newPassword}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t.auth.confirmNewPassword}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {t.auth.resetButton}
      </Button>
    </form>
  );
}
