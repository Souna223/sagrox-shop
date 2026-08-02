"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  PackageCheck,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatBRL, formatNumber } from "@/lib/format";

type Stats = {
  visitors: number;
  sessions: number;
  pageViews: number;
  addToCart: number;
  checkoutsStarted: number;
  abandoned: number;
  orders: number;
  revenue: number;
  purchaseEvents: number;
};

type SeriesPoint = {
  date: string;
  label: string;
  visitors: number;
  pageViews: number;
  orders: number;
  revenue: number;
};

const RANGES = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

export function AnalyticsView({ range, stats, series }: { range: string; stats: Stats; series: SeriesPoint[] }) {
  const router = useRouter();

  const conversion =
    stats.sessions > 0 ? ((stats.orders / stats.sessions) * 100).toFixed(2) : "0,00";
  const checkoutConversion =
    stats.checkoutsStarted > 0 ? ((stats.orders / stats.checkoutsStarted) * 100).toFixed(2) : "0,00";
  const cartConversion =
    stats.addToCart > 0 ? ((stats.orders / stats.addToCart) * 100).toFixed(2) : "0,00";

  const chartConfig = {
    visitors: { label: "Visitantes", color: "hsl(var(--primary))" },
    pageViews: { label: "Visualizações", color: "hsl(var(--chart-2))" },
    orders: { label: "Pedidos", color: "hsl(var(--chart-3))" },
    revenue: { label: "Receita", color: "hsl(var(--chart-4))" },
  } satisfies ChartConfig;

  const kpis: {
    label: string;
    value: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { label: "Visitantes", value: formatNumber(stats.visitors), hint: `${formatNumber(stats.sessions)} sessões`, icon: Users },
    { label: "Visualizações de página", value: formatNumber(stats.pageViews), hint: "páginas visitadas", icon: Eye },
    { label: "Adições ao carrinho", value: formatNumber(stats.addToCart), hint: "itens adicionados", icon: ShoppingCart },
    { label: "Checkouts iniciados", value: formatNumber(stats.checkoutsStarted), hint: "clientes no checkout", icon: CreditCard },
    { label: "Checkouts abandonados", value: formatNumber(stats.abandoned), hint: `${checkoutConversion}% concluíram`, icon: AlertCircle },
    { label: "Pedidos", value: formatNumber(stats.orders), hint: "pedidos realizados", icon: PackageCheck },
    { label: "Receita", value: formatBRL(stats.revenue), hint: "valor total", icon: ShoppingBag },
    { label: "Taxa de conversão", value: `${conversion}%`, hint: `${cartConversion}% de carrinho`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analíticas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visitantes, checkouts e vendas da sua loja.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => router.replace(`/admin/analiticas?range=${r.value}`)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-start justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <kpi.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Visitantes e pedidos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <AreaChart data={series} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="visitors"
                  type="monotone"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  name="visitors"
                />
                <Area
                  dataKey="orders"
                  type="monotone"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.15}
                  name="orders"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <AreaChart data={series} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={(v) => formatCompact(v)} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.15}
                  name="revenue"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Funil de conversão</CardTitle>
          <Link href="/admin/pedidos" className="text-sm font-medium text-primary hover:underline">
            Ver pedidos
          </Link>
        </CardHeader>
        <CardContent>
          <Funnel items={[
            { label: "Visitantes", value: stats.sessions },
            { label: "Adicionaram ao carrinho", value: stats.addToCart },
            { label: "Iniciaram checkout", value: stats.checkoutsStarted },
            { label: "Pedidos concluídos", value: stats.orders },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
}

function Funnel({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">
                {formatNumber(item.value)}
                {idx > 0 && items[idx - 1].value > 0
                  ? ` (${((item.value / items[idx - 1].value) * 100).toFixed(0)}%)`
                  : ""}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
}
