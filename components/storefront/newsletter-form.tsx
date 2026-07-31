"use client";

import { useState } from "react";
import { Send, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

export function NewsletterForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSubscribed(true);
      toast.success(t.newsletter.success);
    } catch {
      toast.error(t.newsletter.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground lg:p-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        {subscribed ? (
          <MailCheck className="size-12" />
        ) : (
          <Send className="size-12" />
        )}
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            {subscribed ? t.newsletter.confirmed : t.newsletter.title}
          </h2>
          <p className="mt-2 text-primary-foreground/80">
            {subscribed ? t.newsletter.confirmedSubtitle : t.newsletter.subtitle}
          </p>
        </div>
        {!subscribed ? (
          <form onSubmit={submit} className="flex w-full max-w-md gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.newsletter.emailPlaceholder}
              className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <Button type="submit" variant="secondary" disabled={loading}>
              {loading ? t.newsletter.sending : t.newsletter.subscribe}
            </Button>
          </form>
        ) : null}
        <p className="text-xs text-primary-foreground/60">
          {t.newsletter.privacyNotice}
        </p>
      </div>
    </div>
  );
}
