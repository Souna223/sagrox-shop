import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, ShoppingBag, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CustomerActions } from "@/components/admin/customer-actions";
import { ROLE_LABEL, ORDER_STATUS, ORDER_STATUS_STYLES, PAYMENT_METHOD } from "@/lib/constants";
import { formatBRL, formatDateTime, formatCPF, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalhes do cliente",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      customerNotes: {
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true } } },
      },
      referredBy: { select: { id: true, name: true, email: true } },
      _count: { select: { orders: true, reviews: true, wishlistItems: true, referralOf: true } },
    },
  });

  if (!user) notFound();

  const [recentOrders, totals] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.aggregate({
      where: { userId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const lifetimeTotal = totals._sum.total ? Number(totals._sum.total.toString()) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.isVip ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">VIP</span>
          ) : null}
          {user.isBlocked ? (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Bloqueado</span>
          ) : null}
          {!user.isActive ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Conta desativada</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROLE_LABEL[user.role]} • cadastro em {formatDateTime(user.createdAt)}
          {user.lastLoginAt ? ` • último acesso ${formatDateTime(user.lastLoginAt)}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-background p-5">
              <p className="text-sm text-muted-foreground">Pedidos</p>
              <p className="mt-1 text-2xl font-bold">{user._count.orders}</p>
            </div>
            <div className="rounded-xl border bg-background p-5">
              <p className="text-sm text-muted-foreground">Total em compras</p>
              <p className="mt-1 text-2xl font-bold">{formatBRL(lifetimeTotal)}</p>
            </div>
            <div className="rounded-xl border bg-background p-5">
              <p className="text-sm text-muted-foreground">Avaliações / Desejos</p>
              <p className="mt-1 text-2xl font-bold">
                {user._count.reviews} / {user._count.wishlistItems}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
              <ShoppingBag className="size-4" /> Pedidos recentes
            </div>
            {recentOrders.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">#{order.number}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                        {" • "}
                        {order.paymentMethod ? PAYMENT_METHOD[order.paymentMethod] ?? order.paymentMethod : "—"}
                        {" • "}
                        {order._count.items} item{order._count.items === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatBRL(Number(order.total.toString()))}</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          ORDER_STATUS_STYLES[order.status as keyof typeof ORDER_STATUS_STYLES] ?? "bg-muted",
                        )}
                      >
                        {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {user.addresses.length > 0 ? (
            <div className="rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
                <MapPin className="size-4" /> Endereços
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {user.addresses.map((address) => (
                  <div key={address.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{address.label}</span>
                      {address.isDefault ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Principal
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {address.street}, {address.number}
                      {address.complement ? ` — ${address.complement}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {address.neighborhood} • {address.city} - {address.state}
                    </p>
                    <p className="text-muted-foreground">CEP {address.zip}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
              <Star className="size-4" /> Notas internas
            </div>
            {user.customerNotes.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Nenhuma nota registrada.</p>
            ) : (
              <div className="divide-y">
                {user.customerNotes.map((note) => (
                  <div key={note.id} className="p-5">
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(note.createdAt)} • {note.customer.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-background p-5">
            <div className="text-sm font-semibold">Informações</div>
            <div className="mt-3 space-y-3 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" /> {user.email}
              </p>
              {user.phone ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" /> {formatPhone(user.phone)}
                </p>
              ) : null}
              {user.cpf ? (
                <p className="text-muted-foreground">CPF: {formatCPF(user.cpf)}</p>
              ) : null}
              {user.birthDate ? (
                <p className="text-muted-foreground">Nascimento: {formatDateTime(user.birthDate)}</p>
              ) : null}
              {user.gender ? <p className="text-muted-foreground">Gênero: {user.gender}</p> : null}
              <p className="text-muted-foreground">
                Newsletter: {user.newsletter ? "Assinante" : "Não assinante"}
              </p>
              {user.referredBy ? (
                <p className="text-muted-foreground">
                  Indicado por:{" "}
                  <Link href={`/admin/clientes/${user.referredBy.id}`} className="font-medium text-primary hover:underline">
                    {user.referredBy.name ?? user.referredBy.email}
                  </Link>
                </p>
              ) : null}
              {user.referralCode ? (
                <p className="text-muted-foreground">Código de indicação: {user.referralCode}</p>
              ) : null}
              {user._count.referralOf > 0 ? (
                <p className="text-muted-foreground">Indicou {user._count.referralOf} pessoa{user._count.referralOf === 1 ? "" : "s"}</p>
              ) : null}
            </div>
          </div>

          <CustomerActions customerId={user.id} isBlocked={user.isBlocked} isVip={user.isVip} isActive={user.isActive} />
        </div>
      </div>
    </div>
  );
}
