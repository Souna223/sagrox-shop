import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/storefront/page-header";
import { ContactForm } from "@/components/storefront/contact-form";
import { getDictionary } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.contactTitle,
    description: t.pages.contactDescription,
  };
}

export default async function ContactPage() {
  const t = await getDictionary();
  const settings = await getSettings();

  const channels = [
    ...(settings.email
      ? [{ icon: Mail, label: "E-mail", value: settings.email, href: `mailto:${settings.email}` }]
      : []),
    ...(settings.phone
      ? [{ icon: Phone, label: "Telefone", value: settings.phone, href: `tel:${settings.phone.replace(/\D/g, "")}` }]
      : []),
    ...(settings.whatsapp
      ? [
          {
            icon: MessageCircle,
            label: "WhatsApp",
            value: settings.whatsapp,
            href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`,
          },
        ]
      : []),
    ...(settings.address
      ? [{ icon: MapPin, label: "Endereço", value: settings.address, href: undefined as string | undefined }]
      : []),
    ...(settings.businessHours
      ? [{ icon: Clock, label: "Horário", value: settings.businessHours, href: undefined as string | undefined }]
      : []),
  ];

  return (
    <div>
      <PageHeader title={t.pages.contactTitle} description={t.pages.contactDescription} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="mb-5 text-xl font-bold tracking-tight">Envie sua mensagem</h2>
            <ContactForm
              t={{
                contactFormName: t.pages.contactFormName,
                contactFormNamePlaceholder: t.pages.contactFormNamePlaceholder,
                contactFormEmail: t.pages.contactFormEmail,
                contactFormEmailPlaceholder: t.pages.contactFormEmailPlaceholder,
                contactFormMessage: t.pages.contactFormMessage,
                contactFormMessagePlaceholder: t.pages.contactFormMessagePlaceholder,
                contactFormSend: t.pages.contactFormSend,
                contactFormSending: t.pages.contactFormSending,
                contactFormSent: t.pages.contactFormSent,
                contactFormError: t.pages.contactFormError,
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-xl font-bold tracking-tight">Canais de atendimento</h2>
            <div className="space-y-3">
              {channels.map((channel) => {
                const inner = (
                  <>
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <channel.icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{channel.label}</div>
                      <div className="truncate font-medium">{channel.value}</div>
                    </div>
                  </>
                );
                return channel.href ? (
                  <a
                    key={channel.label}
                    href={channel.href}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/40"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={channel.label} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                    {inner}
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Preferimos responder pelo formulário ou WhatsApp para organizar melhor o atendimento.
              Dúvidas sobre pedidos podem ser resolvidas também na página{" "}
              <a href="/faq" className="font-semibold text-primary underline-offset-4 hover:underline">
                Dúvidas frequentes
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
