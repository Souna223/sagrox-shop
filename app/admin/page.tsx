import type { Metadata } from "next";
import Link from "next/link";
import { startOfToday } from "date-fns";
import {
  DollarSign,
  Clock,
  PackageX,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const todayStart = startOfToday();

  const [todayRevenue, todayOrders, totalOrders, totalRevenue, awaitingPayment, todayCustomers, totalCustomers, recentOrders, lowStockList] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: "APPROVED", paidAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: "APPROVED" },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { paymentStatus: "PENDING" } }),
      prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          number: true,
          customerName: true,
          email: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        orderBy: { stock: "asc" },
        take: 6,
        select: { id: true, name: true, slug: true, sku: true, stock: true, lowStockThreshold: true },
      }),
    ]);

  const lowStockCount = await prisma.product.count({
    where: {
      status: "ACTIVE",
      OR: [{ stock: { lte: 0 } }, { stock: { lte: prisma.product.fields.lowStockThreshold } }],
    },
  });

  const stats = [
    {
      label: "Vendas hoje",
      value: formatBRL(todayRevenue._sum.total ?? 0),
      hint: `${todayOrders} pedido${todayOrders === 1 ? "" : "s"} hoje`,
      icon: DollarSign,
      up: true,
    },
    {
      label: "Receita total",
      value: formatBRL(totalRevenue._sum.total ?? 0),
      hint: `${totalOrders} pedido${totalOrders === 1 ? "" : "s"} no total`,
      icon: ArrowUpRight,
      up: true,
    },
    {
      label: "Aguardando pagamento",
      value: String(awaitingPayment),
      hint: "pedidos pendentes",
      icon: Clock,
      up: false,
    },
    {
      label: "Clientes",
      value: String(totalCustomers),
      hint: `+${todayCustomers} hoje`,
      icon: Users,
      up: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da sua loja.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-start justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowStockCount > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          <PackageX className="size-5" />
          <p>
            <strong>{lowStockCount}</strong> produto{lowStockCount === 1 ? "" : "s"} com estoque baixo ou esgotado.
            <Link href="/admin/produtos" className="ml-1 font-medium underline underline-offset-2">
              Reabastecer
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pedidos recentes</CardTitle>
            <Link href="/admin/pedidos" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.number}>
                    <TableCell>
                      <Link
                        href={`/admin/pedidos/${order.number}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{order.number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{order.customerName}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={ORDER_STATUS_STYLES[order.status]}>
                        {ORDER_STATUS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBRL(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum produto com estoque baixo.
              </p>
            ) : (
              <ul className="space-y-3">
                {lowStockList.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/admin/produtos/${product.id}/editar`}
                      className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <span className="truncate text-sm font-medium">{product.name}</span>
                      <span
                        className={
                          product.stock <= 0
                            ? "text-sm font-bold text-destructive"
                            : "text-sm font-semibold text-amber-600"
                        }
                      >
                        {product.stock <= 0 ? "Esgotado" : `${product.stock} un.`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
