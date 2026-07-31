import type { Metadata } from "next";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

export default async function OrdersPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const orders = await prisma.order.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o status e o histórico das suas compras.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Nenhum pedido ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando você fizer uma compra, ela aparecerá aqui.
              </p>
            </div>
            <Button render={<Link href="/produtos" />}>Explorar produtos</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.number}
              href={`/conta/pedidos/${order.number}`}
              className="group block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Pedido #{order.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} •{" "}
                      {order._count.items} item{order._count.items === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={ORDER_STATUS_STYLES[order.status]}>
                    {ORDER_STATUS[order.status]}
                  </Badge>
                  <span className="text-sm font-bold">{formatBRL(order.total)}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
