import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, PackageCheck, ClipboardList, CreditCard, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/storefront/page-header";
import { getDictionary } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.returnsTitle,
    description: t.pages.returnsDescription,
  };
}

export default async function ReturnsPage() {
  const t = await getDictionary();
  const settings = await getSettings();

  const deadlines = [
    { icon: CalendarClock, title: "Desistência", text: "Até 7 dias corridos após o recebimento do produto, sem precisar justificar (art. 49 do CDC)." },
    { icon: PackageCheck, title: "Produto com defeito", text: "Até 30 dias corridos após o recebimento para solicitar reparo, troca ou reembolso." },
    { icon: ClipboardList, title: "Recebeu algo errado", text: "Fale conosco em até 7 dias para acionarmos a troca e organizarmos o envio correto." },
  ];

  const steps = [
    "Entre em contato pelo formulário de contato ou WhatsApp informando o número do pedido e o motivo.",
    "Nossa equipe vai confirmar o procedimento e te enviar as instruções de devolução.",
    "Envie o produto na embalagem original, sem sinais de uso, com todos os acessórios.",
    "Após recebermos e analisarmos o produto, realizamos a troca ou o reembolso.",
  ];

  return (
    <div>
      <PageHeader title={t.pages.returnsTitle} description={t.pages.returnsDescription} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Prazos e situações</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {deadlines.map((item) => (
              <div key={item.title} className="rounded-2xl border bg-card p-6">
                <item.icon className="size-7 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Como solicitar</h2>
          <ol className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4 rounded-2xl border bg-card p-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="size-5 text-primary" />
              Prazos de reembolso
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Cartão de crédito:</strong> até 2 faturas, conforme o ciclo da operadora.</li>
              <li><strong className="text-foreground">Pix:</strong> até 5 dias úteis após a confirmação da devolução.</li>
              <li><strong className="text-foreground">Boleto bancário:</strong> até 7 dias úteis, via depósito ou transferência.</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="size-5 text-primary" />
              Precisa de ajuda?
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Nosso time está à disposição para esclarecer qualquer dúvida sobre trocas, devoluções ou reembolsos.
              {settings.email ? ` E-mail: ${settings.email}.` : ""}
            </p>
            <Link
              href="/contato"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Falar com o suporte
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
