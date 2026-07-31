import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  MapPin,
  Heart,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.accountTitle,
  };
}

export default async function AccountDashboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const t = await getDictionary();

  const [user, recentOrders, addressCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, email: true, createdAt: true, isVip: true },
    }),
    prisma.order.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        number: true,
        status: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
      },
    }),
    prisma.address.count({ where: { userId: sessionUser.id } }),
  ]);

  const quickActions = [
    { href: "/conta/pedidos", label: t.account.myOrders, icon: Package, description: t.account.trackPurchases },
    { href: "/conta/desejos", label: t.account.wishlist, icon: Heart, description: t.account.savedProducts },
    { href: "/conta/enderecos", label: t.account.addresses, icon: MapPin, description: fmt(t.account.registeredCount, { n: addressCount }) },
    { href: "/conta/dados", label: t.account.personalData, icon: UserRound, description: t.account.profileAndPassword },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {fmt(t.account.hello, { name: user?.name?.split(" ")[0] ?? t.account.welcome })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.account.manageText}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <action.icon className="size-5" />
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-3 text-sm font-semibold">{action.label}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t.account.recentOrders}</CardTitle>
          <Link href="/conta/pedidos" className="text-sm font-medium text-primary hover:underline">
            {t.account.viewAll}
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Package className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t.account.noOrdersYet}</p>
              <Link href="/produtos" className="text-sm font-medium text-primary hover:underline">
                {t.account.startShopping}
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {recentOrders.map((order) => (
                <li key={order.number}>
                  <Link
                    href={`/conta/pedidos/${order.number}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {fmt(t.account.orderNumber, { number: order.number })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={ORDER_STATUS_STYLES[order.status]}>
                        {ORDER_STATUS[order.status]}
                      </Badge>
                      <span className="text-sm font-semibold">{formatBRL(order.total)}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
