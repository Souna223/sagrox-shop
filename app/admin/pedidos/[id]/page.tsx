import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShoppingBag, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializeAdminOrder } from "@/lib/admin-orders";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { DeleteOrderButton } from "@/components/admin/delete-order-button";
import {
  ORDER_STATUS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "@/lib/constants";
import { formatBRL, formatDateTime, formatCPForCNPJ, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalhes do pedido",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

type OrderJson = {
  id: string;
  number: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  installments: number | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  customerName: string;
  email: string;
  customerCpf: string | null;
  couponCode: string | null;
  notes: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  shippingService: string | null;
  shippingEstimateDays: number | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: Record<string, unknown> | null;
  billingAddress: Record<string, unknown> | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  user: { id: string; name: string | null; email: string; phone: string | null; isBlocked: boolean; role: string } | null;
  items: {
    id: string;
    name: string;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variation: { id: string; name: string } | null;
  }[];
  payments: {
    id: string;
    gateway: string;
    method: string | null;
    status: string;
    amount: number;
    installments: number | null;
    cardLast4: string | null;
    cardBrand: string | null;
    pixCode: string | null;
    boletoUrl: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
  shipments: {
    id: string;
    provider: string;
    service: string | null;
    trackingCode: string | null;
    status: string;
    createdAt: string;
  }[];
  couponUsages: { coupon: { code: string } }[];
};

function AddressCard({ title, address, icon }: { title: string; address: Record<string, unknown> | null; icon?: React.ReactNode }) {
  if (!address) return null;
  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
        <p>
          {String(address.street ?? "")}, {String(address.number ?? "")}
          {address.complement ? ` — ${String(address.complement)}` : ""}
        </p>
        <p>
          {String(address.neighborhood ?? "")} • {String(address.city ?? "")} - {String(address.state ?? "")}
        </p>
        <p>CEP {String(address.zip ?? "")}</p>
        {typeof address === "object" && "recipientName" in address ? (
          <p className="pt-1 font-medium text-foreground">{String(address.recipientName)}</p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, isBlocked: true, role: true },
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { id: true, slug: true } },
          variation: { select: { id: true, name: true } },
        },
      },
      payments: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "asc" } },
      couponUsages: { include: { coupon: { select: { code: true } } } },
    },
  });

  if (!order) notFound();

  const o = serializeAdminOrder(order as never) as unknown as OrderJson;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Pedido #{o.number}</h1>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              ORDER_STATUS_STYLES[o.status as keyof typeof ORDER_STATUS_STYLES] ?? "bg-muted",
            )}
          >
            {ORDER_STATUS[o.status as keyof typeof ORDER_STATUS] ?? o.status}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              o.paymentStatus === "APPROVED" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground",
            )}
          >
            Pagamento: {PAYMENT_STATUS[o.paymentStatus as keyof typeof PAYMENT_STATUS] ?? o.paymentStatus}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Criado em {formatDateTime(o.createdAt)}
          {o.updatedAt !== o.createdAt ? ` • atualizado em ${formatDateTime(o.updatedAt)}` : ""}
        </p>
      </div>

      <OrderStatusControl
        orderId={o.id}
        currentStatus={o.status}
        trackingCode={o.trackingCode}
        trackingUrl={o.trackingUrl}
      />

      <div className="flex justify-end">
        <DeleteOrderButton orderId={o.id} orderNumber={o.number} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
              <ShoppingBag className="size-4" /> Itens do pedido
            </div>
            <div className="divide-y">
              {o.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-5">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      SKU {item.sku}
                      {item.variation ? ` • ${item.variation.name}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.quantity} × {formatBRL(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right text-sm font-semibold">{formatBRL(item.totalPrice)}</div>
                </div>
              ))}
            </div>
            <div className="border-t px-5 py-4">
              <Row label="Subtotal" value={formatBRL(o.subtotal)} />
              {o.discount > 0 ? <Row label="Desconto" value={`- ${formatBRL(o.discount)}`} /> : null}
              <Row label="Frete" value={o.shippingFee > 0 ? formatBRL(o.shippingFee) : "Grátis"} />
              <div className="mt-2 flex items-center justify-between border-t pt-3 text-base font-bold">
                <span>Total</span>
                <span>{formatBRL(o.total)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <AddressCard
              title="Endereço de entrega"
              address={o.shippingAddress as Record<string, unknown> | null}
              icon={<MapPin className="size-4" />}
            />
            <AddressCard
              title="Endereço de cobrança"
              address={o.billingAddress as Record<string, unknown> | null}
              icon={<MapPin className="size-4" />}
            />
          </div>

          {o.payments.length > 0 ? (
            <div className="rounded-xl border bg-background">
              <div className="border-b p-5 text-sm font-semibold">Pagamentos</div>
              <div className="divide-y">
                {o.payments.map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
                    <div>
                      <p className="font-medium">
                        {payment.method ? PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD] ?? payment.method : "—"}
                        {payment.installments ? ` • ${payment.installments}x` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {payment.gateway}
                        {payment.cardLast4 ? ` • •••• ${payment.cardLast4}` : ""}
                        {payment.cardBrand ? ` • ${payment.cardBrand}` : ""}
                      </p>
                      {payment.pixCode ? (
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">Pix copia e cola: {payment.pixCode}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatBRL(payment.amount)}</p>
                      <span
                        className={cn(
                          "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          payment.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {PAYMENT_STATUS[payment.status as keyof typeof PAYMENT_STATUS] ?? payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {o.shipments.length > 0 ? (
            <div className="rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
                <Truck className="size-4" /> Entregas
              </div>
              <div className="divide-y">
                {o.shipments.map((shipment) => (
                  <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
                    <div>
                      <p className="font-medium">
                        {shipment.provider}
                        {shipment.service ? ` • ${shipment.service}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {shipment.trackingCode ? `Código: ${shipment.trackingCode}` : "Sem código de rastreio"}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {shipment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-background p-5">
            <div className="text-sm font-semibold">Cliente</div>
            <p className="mt-3 text-sm font-medium">{o.customerName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{o.email}</p>
            {o.customerCpf ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{formatCPForCNPJ(o.customerCpf)}</p>
            ) : null}
            {o.user ? (
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Conta:</span>{" "}
                  <Link href={`/admin/clientes/${o.user.id}`} className="font-medium text-primary hover:underline">
                    {o.user.name ?? o.user.email}
                  </Link>
                </p>
                {o.user.phone ? <p>{formatPhone(o.user.phone)}</p> : null}
                {o.user.isBlocked ? (
                  <p className="font-medium text-destructive">Usuário bloqueado</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-background p-5">
            <div className="text-sm font-semibold">Resumo</div>
            <div className="mt-3">
              <Row label="Status do pedido" value={ORDER_STATUS[o.status as keyof typeof ORDER_STATUS] ?? o.status} />
              <Row label="Pagamento" value={o.paymentMethod ? PAYMENT_METHOD[o.paymentMethod as keyof typeof PAYMENT_METHOD] ?? o.paymentMethod : "—"} />
              <Row label="Parcelas" value={o.installments ? `${o.installments}x` : "—"} />
              <Row label="Frete" value={o.shippingFee > 0 ? formatBRL(o.shippingFee) : "Grátis"} />
              <Row label="Serviço de envio" value={o.shippingService ?? "—"} />
              <Row label="Prazo estimado" value={o.shippingEstimateDays ? `${o.shippingEstimateDays} dias úteis` : "—"} />
              {o.couponCode ? (
                <Row label="Cupom" value={<span className="font-semibold text-primary">{o.couponCode}</span>} />
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <div className="text-sm font-semibold">Linha do tempo</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado</span>
                <span>{formatDateTime(o.createdAt)}</span>
              </div>
              {o.paidAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pago</span>
                  <span>{formatDateTime(o.paidAt)}</span>
                </div>
              ) : null}
              {o.shippedAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Enviado</span>
                  <span>{formatDateTime(o.shippedAt)}</span>
                </div>
              ) : null}
              {o.deliveredAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entregue</span>
                  <span>{formatDateTime(o.deliveredAt)}</span>
                </div>
              ) : null}
              {o.cancelledAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelado</span>
                  <span>{formatDateTime(o.cancelledAt)}</span>
                </div>
              ) : null}
            </div>
            {o.cancelledReason ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">
                Motivo do cancelamento: {o.cancelledReason}
              </p>
            ) : null}
          </div>

          {o.notes ? (
            <div className="rounded-xl border bg-background p-5">
              <div className="text-sm font-semibold">Observações</div>
              <p className="mt-2 text-sm text-muted-foreground">{o.notes}</p>
            </div>
          ) : null}

          {(o.utmSource || o.utmCampaign || o.utmMedium) ? (
            <div className="rounded-xl border bg-background p-5">
              <div className="text-sm font-semibold">Origem (UTM)</div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {o.utmSource ? <p>Source: {o.utmSource}</p> : null}
                {o.utmMedium ? <p>Medium: {o.utmMedium}</p> : null}
                {o.utmCampaign ? <p>Campanha: {o.utmCampaign}</p> : null}
                {o.utmTerm ? <p>Termo: {o.utmTerm}</p> : null}
                {o.utmContent ? <p>Conteúdo: {o.utmContent}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
