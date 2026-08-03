"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Dictionary = {
  contactFormName: string;
  contactFormNamePlaceholder: string;
  contactFormEmail: string;
  contactFormEmailPlaceholder: string;
  contactFormMessage: string;
  contactFormMessagePlaceholder: string;
  contactFormSend: string;
  contactFormSending: string;
  contactFormSent: string;
  contactFormError: string;
};

export function ContactForm({ t }: { t: Dictionary }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus("idle");

    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      message: String(form.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "error");
      }
      setStatus("success");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="size-12 text-primary" />
        <p className="mt-4 font-semibold">{t.contactFormSent}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setStatus("idle")}
        >
          {t.contactFormSend}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border bg-card p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">{t.contactFormName}</Label>
          <Input
            id="contact-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder={t.contactFormNamePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">{t.contactFormEmail}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder={t.contactFormEmailPlaceholder}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">{t.contactFormMessage}</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder={t.contactFormMessagePlaceholder}
        />
      </div>

      {status === "error" ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {t.contactFormError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? t.contactFormSending : t.contactFormSend}
      </Button>
    </form>
  );
}
