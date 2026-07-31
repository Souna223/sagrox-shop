"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { onlyDigits } from "@/lib/br";
import { useI18n } from "@/lib/i18n/provider";

function formatCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: onlyDigits(phone) || undefined,
          cpf: onlyDigits(cpf) || undefined,
          password,
          newsletter,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t.auth.createAccountError);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        toast.success(t.auth.accountCreatedLogin);
        router.push("/login");
        return;
      }

      toast.success(t.auth.accountCreated);
      router.push("/conta");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.auth.name}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.auth.namePlaceholder}
          autoComplete="name"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t.auth.phone} <span className="text-muted-foreground">{t.auth.optional}</span></Label>
          <Input
            id="phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cpf">{t.auth.cpf} <span className="text-muted-foreground">{t.auth.optional}</span></Label>
          <Input
            id="cpf"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t.auth.password}</Label>
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
          <Label htmlFor="confirm">{t.auth.confirmPassword}</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={newsletter}
          onCheckedChange={(v) => setNewsletter(!!v)}
          className="mt-0.5"
        />
        <span>
          {t.auth.newsletterOptIn}
        </span>
      </label>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {t.auth.createAccount}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.signInLink}
        </Link>
      </p>
    </form>
  );
}
