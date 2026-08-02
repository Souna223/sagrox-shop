"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  PackageCheck,
  PackageSearch,
  Truck,
  CalendarDays,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, formatDateTime } from "@/lib/format";

type AwaitingOrder = {
  id: string;
  number: number;
  customerName: string;
  email: string;
  total: number;
  status: string;
  shippingAddress: Record<string, unknown> | null;
  shippingService: string | null;
  trackingCode: string | null;
  paidAt: string | null;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

type Shipment = {
  id: string;
  provider: string;
  service: string | null;
  trackingCode: string | null;
  status: string;
  createdAt: string;
  order: {
    number: number;
    customerName: string;
    orderStatus: string;
    trackingCode: string | null;
    trackingUrl: string | null;
  };
};

type FulfillmentViewProps = {
  awaiting: AwaitingOrder[];
  shipments: Shipment[];
  stats: {
    awaitingCount: number;
    shippedCount: number;
    shippedTodayCount: number;
    last7Days: number;
  };
};

const SHIPMENT_STATUS_STYLE: Record<string, string> = {
  CREATED: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

function Address({ address }: { address: Record<string, unknown> | null }) {
  if (!address) return <span className="text-xs text-muted-foreground">Sem endereço cadastrado</span>;
  return (
    <span className="block text-xs text-muted-foreground">
      {String(address.street ?? "")}, {String(address.number ?? "")} — {String(address.neighborhood ?? "")}
      <span className="block">
        {String(address.city ?? "")} - {String(address.state ?? "")} • CEP {String(address.zip ?? "")}
      </span>
    </span>
  );
}

export function FulfillmentView({ awaiting, shipments, stats }: FulfillmentViewProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<AwaitingOrder | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [provider, setProvider] = useState("CORREIOS");
  const [saving, setSaving] = useState(false);

  const openFulfill = (order: AwaitingOrder) => {
    setSelected(order);
    setTrackingCode(order.trackingCode ?? "");
    setTrackingUrl("");
    setProvider("CORREIOS");
  };

  const submit = async () => {
    if (!selected) return;
    if (!trackingCode.trim()) {
      toast.error("Informe o código de rastreio.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.id,
          provider,
          trackingCode,
          trackingUrl: trackingUrl.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao marcar como enviado.");
        return;
      }
      toast.success(`Pedido #${selected.number} marcado como enviado.`);
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Erro ao marcar como enviado.");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: "Aguardando envio", value: String(stats.awaitingCount), icon: PackageSearch },
    { label: "Enviados no total", value: String(stats.shippedCount), icon: PackageCheck },
    { label: "Enviados hoje", value: String(stats.shippedTodayCount), icon: Truck },
    { label: "Enviados (7 dias)", value: String(stats.last7Days), icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fulfillment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos pagos aguardando envio e histórico de entregas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-start justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <card.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-background">
        <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
          <PackageSearch className="size-4" /> Aguardando envio
        </div>
        {awaiting.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum pedido aguardando envio. Tudo pronto!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead className="hidden md:table-cell">Itens</TableHead>
                <TableHead className="hidden lg:table-cell">Endereço</TableHead>
                <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awaiting.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        #{order.number}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customerName}
                        <span className="hidden sm:inline"> • {order.email}</span>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-64 md:table-cell">
                    <div className="space-y-0.5">
                      {order.items.slice(0, 3).map((item, index) => (
                        <p key={index} className="truncate text-xs text-muted-foreground">
                          {item.quantity}× {item.name}
                        </p>
                      ))}
                      {order.items.length > 3 ? (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 3} item(ns)</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Address address={order.shippingAddress} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{order.shippingService ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.paidAt ? formatDateTime(order.paidAt) : formatDateTime(order.createdAt)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatBRL(order.total)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button size="sm" onClick={() => openFulfill(order)} />}>
                        <Truck className="size-4" /> Marcar enviado
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Marcar pedido #{selected?.number ?? order.number} como enviado</DialogTitle>
                          <DialogDescription>
                            Informe o código de rastreio e a transportadora para registrar o envio.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="ff-provider">Transportadora</Label>
                            <select
                              id="ff-provider"
                              value={provider}
                              onChange={(e) => setProvider(e.target.value)}
                              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <option value="CORREIOS">Correios</option>
                              <option value="JADLOG">Jadlog</option>
                              <option value="TOTALEX">Total Express</option>
                              <option value="MELHORENVIO">Melhor Envio</option>
                              <option value="OUTROS">Outra</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ff-code">Código de rastreio</Label>
                            <Input
                              id="ff-code"
                              value={trackingCode}
                              onChange={(e) => setTrackingCode(e.target.value)}
                              placeholder="Ex.: BR1234567890"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ff-url">Link de rastreio (opcional)</Label>
                            <Input
                              id="ff-url"
                              value={trackingUrl}
                              onChange={(e) => setTrackingUrl(e.target.value)}
                              placeholder="https://rastreamento.correios.com.br/..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelected(null)}>
                            Cancelar
                          </Button>
                          <Button onClick={submit} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                            Confirmar envio
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border bg-background">
        <div className="flex items-center gap-2 border-b p-5 text-sm font-semibold">
          <Truck className="size-4" /> Envios recentes
        </div>
        {shipments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum envio registrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Transportadora</TableHead>
                <TableHead className="hidden md:table-cell">Código de rastreio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell>
                    <Link
                      href={`/admin/pedidos/${shipment.order.number}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      #{shipment.order.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{shipment.order.customerName}</TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">{shipment.provider}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {shipment.trackingCode ? (
                      shipment.order.trackingUrl ? (
                        <a
                          href={shipment.order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {shipment.trackingCode}
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="text-sm">{shipment.trackingCode}</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        SHIPMENT_STATUS_STYLE[shipment.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {shipment.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(shipment.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
