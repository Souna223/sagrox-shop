import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  CreditCard,
  Zap,
  Truck,
  Headset,
  RefreshCcw,
  Target,
  Eye,
  HeartHandshake,
} from "lucide-react";
import { PageHeader } from "@/components/storefront/page-header";
import { getDictionary } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.aboutTitle,
    description: t.pages.aboutDescription,
  };
}

export default async function AboutPage() {
  const t = await getDictionary();
  const settings = await getSettings();

  const values = [
    { icon: Target, title: "Missão", text: `Levar produtos de qualidade com preço justo e entrega rápida para todo o Brasil, oferecendo uma experiência de compra simples e segura.` },
    { icon: Eye, title: "Visão", text: `Ser referência em compras online, combinando variedade, confiança e atendimento próximo, para que cada cliente se sinta bem atendido em todas as etapas.` },
    { icon: HeartHandshake, title: "Valores", text: `Transparência, respeito ao cliente, agilidade e compromisso com a satisfação em cada compra. O cliente é o coração do nosso negócio.` },
  ];

  const benefits = [
    { icon: ShieldCheck, text: "Compra 100% segura" },
    { icon: CreditCard, text: "Pagamento em até 12x" },
    { icon: Zap, text: "Pix com desconto" },
    { icon: Truck, text: "Entrega para todo o Brasil" },
    { icon: Headset, text: "Atendimento próximo" },
    { icon: RefreshCcw, text: "Trocas e devoluções facilitadas" },
  ];

  return (
    <div>
      <PageHeader title={t.pages.aboutTitle} description={t.pages.aboutDescription} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <section className="max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Quem somos</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {settings.storeDescription || `A ${settings.storeName} é uma loja online criada para facilitar a vida de quem compra pela internet. Unimos variedade de produtos, preços competitivos e um processo de compra descomplicado — do pagamento à entrega.`}
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Trabalhamos com fornecedores selecionados e uma logística pensada para o Brasil inteiro, para que você receba o que comprou com agilidade e segurança. Nosso time está sempre à disposição para ajudar antes, durante e depois da compra.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Missão, visão e valores</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {values.map((item) => (
              <div key={item.title} className="rounded-2xl border bg-card p-6">
                <item.icon className="size-7 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Por que comprar conosco</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl bg-primary p-8 text-center text-primary-foreground sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Pronto para comprar?</h2>
          <p className="mt-2 text-sm opacity-90">
            Explore as ofertas e aproveite frete, descontos e uma entrega pensada para você.
          </p>
          <Link
            href="/produtos"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-primary transition hover:bg-white/90"
          >
            Ver produtos
          </Link>
        </section>
      </div>
    </div>
  );
}
