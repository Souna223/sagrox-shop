import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Clock, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import {
  ORDER_STATUS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Detalhes do pedido",
};

type PageProps = {
  params: Promise<{ number: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const { number } = await params;
  const orderNumber = Number(number);
  if (Number.isNaN(orderNumber)) notFound();

  const data = await prisma.order.findFirst({
    where: { number: orderNumber, userId: sessionUser.id },
    select: {
      number: true,
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
      trackingCode: true,
      trackingUrl: true,
      createdAt: true,
      paidAt: true,
      items: {
        select: {
          name: true,
          sku: true,
          imageUrl: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          productId: true,
        },
      },
      payments: { select: { method: true, status: true, installments: true } },
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

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" className="mb-2 -ml-3 text-muted-foreground" render={<Link href="/conta/pedidos" />}>
          <ArrowLeft className="size-4" /> Voltar para pedidos
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Pedido #{data.number}</h1>
          <Badge className={ORDER_STATUS_STYLES[data.status]}>
            {ORDER_STATUS[data.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Realizado em{" "}
          {new Date(data.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="rounded-xl border">
        <div className="border-b p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4" /> Produtos
          </h2>
          <ul className="space-y-3">
            {data.items.map((item) => (
              <li key={item.sku} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
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
              <Truck className="size-4" /> Entrega
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.shippingService}
              {data.shippingEstimateDays
                ? ` — ${data.shippingEstimateDays} dia${data.shippingEstimateDays === 1 ? "" : "s"} estimado${data.shippingEstimateDays === 1 ? "" : "s"}`
                : ""}
            </p>
            <p className="mt-2 text-sm">
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ""}
              <br />
              {address.neighborhood} — {address.city}/{address.state}
              <br />
              CEP {address.zip}
            </p>
            {data.trackingCode ? (
              <p className="mt-3 text-sm">
                Código de rastreio:{" "}
                {data.trackingUrl ? (
                  <a
                    href={data.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {data.trackingCode}
                  </a>
                ) : (
                  <strong>{data.trackingCode}</strong>
                )}
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4" /> Pagamento
            </h2>
            <p className="text-sm text-muted-foreground">
              {payment?.method ? PAYMENT_METHOD[payment.method] : "—"}
              {payment?.installments ? ` em ${payment.installments}x` : ""}
            </p>
            <p className="mt-1 text-sm">
              Status:{" "}
              <strong>
                {payment ? PAYMENT_STATUS[payment.status] : PAYMENT_STATUS.PENDING}
              </strong>
            </p>
            {data.paidAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Pago em {new Date(data.paidAt).toLocaleDateString("pt-BR")}
              </p>
            ) : null}
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

      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/produtos" />}>Continuar comprando</Button>
        <Button variant="outline" render={<Link href="/contato" />}>Precisa de ajuda?</Button>
      </div>
    </div>
  );
}
