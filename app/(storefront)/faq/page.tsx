import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/storefront/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.faqTitle,
    description: t.pages.faqDescription,
  };
}

const faqs: { question: string; answer: string }[] = [
  {
    question: "Quais formas de pagamento vocês aceitam?",
    answer:
      "Aceitamos Pix, cartão de crédito (em até 12x) e boleto bancário, com pagamento processado pela Appmax — uma plataforma segura e homologada. O Pix pode ter desconto nas condições da loja.",
  },
  {
    question: "O pagamento é seguro?",
    answer:
      "Sim. Todo o processamento de pagamento é feito por uma plataforma certificada (PCI-DSS), com criptografia de ponta a ponta. Seus dados de cartão nunca ficam armazenados nos nossos servidores.",
  },
  {
    question: "Qual o prazo de entrega?",
    answer:
      "O prazo de entrega depende do seu CEP e da transportadora escolhida no checkout. No momento da compra você visualiza o prazo estimado antes de confirmar o pedido.",
  },
  {
    question: "Como faço para rastrear meu pedido?",
    answer:
      "Assim que o pedido é enviado, enviamos o código de rastreio por e-mail. Você também pode rastrear a qualquer momento na página Rastrear pedido, informando o número do pedido e o e-mail da compra.",
  },
  {
    question: "Posso acompanhar meu pedido sem ter conta?",
    answer:
      "Sim! Na página Rastrear pedido você acompanha o status usando apenas o número do pedido e o e-mail informado na compra. Com uma conta, você também encontra tudo em Meus pedidos.",
  },
  {
    question: "Como trocar ou devolver um produto?",
    answer:
      "Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento (desistência) ou 30 dias para produtos com defeito, conforme o Código de Defesa do Consumidor. Veja todos os detalhes na página Trocas e devoluções.",
  },
  {
    question: "Em quanto tempo recebo meu reembolso?",
    answer:
      "O reembolso é feito na mesma forma de pagamento da compra. Prazos típicos: cartão de crédito em até 2 faturas, Pix em até 5 dias úteis e boleto em até 7 dias úteis.",
  },
  {
    question: "Como cancelar um pedido?",
    answer:
      "Se o pedido ainda não foi pago, ele é cancelado automaticamente após o prazo de pagamento. Se você precisa cancelar um pedido pago, fale com nosso atendimento pelo formulário de contato ou WhatsApp antes do envio.",
  },
  {
    question: "Como entro em contato com o suporte?",
    answer:
      "Você pode usar o formulário da página Contato, nosso WhatsApp ou o e-mail de atendimento. Respondemos em horário comercial conforme os canais disponíveis no rodapé da loja.",
  },
];

export default async function FaqPage() {
  const t = await getDictionary();

  return (
    <div>
      <PageHeader title={t.pages.faqTitle} description={t.pages.faqDescription} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Accordion>
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                <p className="leading-relaxed text-muted-foreground">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-xl font-bold tracking-tight">Não encontrou sua resposta?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com a gente pelo formulário de contato e responderemos o mais rápido possível.
          </p>
          <Link
            href="/contato"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Falar com o suporte
          </Link>
        </div>
      </div>
    </div>
  );
}
