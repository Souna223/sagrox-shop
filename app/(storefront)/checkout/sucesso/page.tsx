import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Home, Package, Clock, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pedido confirmado",
};

type PageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { order } = await searchParams;
  if (!order) notFound();

  const orderNumber = Number(order);
  if (Number.isNaN(orderNumber)) notFound();

  const data = await prisma.order.findUnique({
    where: { number: orderNumber },
    select: {
      number: true,
      customerName: true,
      email: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      discount: true,
      shippingFee: true,
      total: true,
      installments: true,
      shippingService: true,
      shippingEstimateDays: true,
      shippingAddress: true,
      items: { select: { name: true, sku: true, imageUrl: true, quantity: true, unitPrice: true, totalPrice: true } },
      payments: { select: { status: true, method: true, pixCode: true, pixQrCode: true, boletoUrl: true, boletoBarcode: true } },
      createdAt: true,
    },
  });

  if (!data) notFound();

  const address = (data.shippingAddress ?? {}) as {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  const payment = data.payments[0];
  const paymentStatusLabel = payment ? PAYMENT_STATUS[payment.status as keyof typeof PAYMENT_STATUS] : PAYMENT_STATUS.PENDING;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Pedido recebido!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Obrigado, {data.customerName}! O pedido <strong>#{data.number}</strong> foi registrado.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos a confirmação para <strong>{data.email}</strong>.
        </p>
      </div>

      <div className="mt-8 rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <p className="text-xs text-muted-foreground">Pedido</p>
            <p className="font-bold">#{data.number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status do pagamento</p>
            <p className="font-bold">
              {paymentStatusLabel}
              {payment?.method ? ` • ${PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD]}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-bold">
              {new Date(data.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="border-b p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4" /> Produtos
          </h2>
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li key={item.sku} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" unoptimized />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x {formatBRL(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatBRL(item.totalPrice)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-6 border-b p-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4" /> Entrega
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.shippingService}
              {data.shippingEstimateDays ? ` — ${data.shippingEstimateDays} dia${data.shippingEstimateDays === 1 ? "" : "s"} estimado${data.shippingEstimateDays === 1 ? "" : "s"}` : ""}
            </p>
            <p className="mt-2 text-sm">
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ""}
              <br />
              {address.neighborhood} — {address.city}/{address.state}
              <br />
              CEP {address.zip}
            </p>
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4" /> Pagamento
            </h2>
            {payment?.method === "PIX" ? (
              <p className="text-sm text-muted-foreground">
                Após a confirmação do Pix, seu pedido será processado. O status será atualizado em sua conta.
              </p>
            ) : payment?.method === "BOLETO" ? (
              <p className="text-sm text-muted-foreground">
                O boleto será enviado por e-mail. O pedido é processado após a compensação (até 2 dias úteis).
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O pagamento será confirmado pela operadora do cartão.
              </p>
            )}
            <p className="mt-2 text-sm">
              Status: <strong>{paymentStatusLabel}</strong>
            </p>
          </div>
        </div>

        <dl className="space-y-2 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatBRL(data.subtotal)}</dd>
          </div>
          {Number(data.discount) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Desconto</dt>
              <dd className="text-emerald-600">-{formatBRL(data.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Frete</dt>
            <dd>{Number(data.shippingFee) === 0 ? "Grátis" : formatBRL(data.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="text-xl font-bold">{formatBRL(data.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button size="lg" render={<Link href="/" />}>
          <Home className="size-4" /> Voltar para a loja
        </Button>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="size-3.5" /> Dúvidas sobre o pedido? Entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
}
