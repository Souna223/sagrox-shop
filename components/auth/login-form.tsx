"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/provider";

type LoginFormProps = {
  callbackUrl?: string;
  error?: string;
};

export function LoginForm({ callbackUrl = "/conta", error }: LoginFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(
          res.error === "blocked"
            ? t.auth.errorBlocked
            : res.error
              ? t.auth.errorCredentials
              : t.auth.errorDefault,
        );
        return;
      }
      toast.success(t.auth.loginSuccess);
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <div>
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === "blocked" ? t.auth.errorBlocked : t.auth.errorCredentials}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link
              href="/recuperar-senha"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          {t.auth.rememberMe}
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {t.auth.signIn}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t.auth.orContinueWith}</span>
        <Separator className="flex-1" />
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={googleLogin} disabled={loading}>
        {t.auth.signInGoogle}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          {t.auth.signUp}
        </Link>
      </p>
    </div>
  );
}
