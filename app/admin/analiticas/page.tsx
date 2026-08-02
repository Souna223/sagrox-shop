import type { Metadata } from "next";
import { subDays, startOfDay, format, eachDayOfInterval } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { AnalyticsView } from "@/components/admin/analytics-view";
import type { AnalyticsEventType } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Analíticas",
};

type PageProps = {
  searchParams: Promise<{ range?: string }>;
};

const RANGES: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { range = "30" } = await searchParams;
  const days = RANGES[range] ?? 30;
  const since = startOfDay(subDays(new Date(), days - 1));

  const eventTypes = ["PAGE_VIEW", "ADD_TO_CART", "BEGIN_CHECKOUT", "PURCHASE"] as AnalyticsEventType[];

  const [events, orderStats, dailyPurchases] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { eventType: { in: eventTypes }, createdAt: { gte: since } },
      select: { eventType: true, sessionId: true, createdAt: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, total: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1);

  const visitors = new Set(events.filter((e) => e.eventType === "PAGE_VIEW").map((e) => e.sessionId).filter(Boolean));
  const startedSessions = new Set(events.filter((e) => e.eventType === "BEGIN_CHECKOUT").map((e) => e.sessionId).filter(Boolean));
  const purchasedSessions = new Set(events.filter((e) => e.eventType === "PURCHASE").map((e) => e.sessionId).filter(Boolean));

  let abandoned = 0;
  for (const s of startedSessions) {
    if (!purchasedSessions.has(s)) abandoned += 1;
  }

  const revenue = orderStats._sum.total ?? 0;
  const visitorsCount = visitors.size;

  const daysArr = eachDayOfInterval({ start: since, end: new Date() });
  const series = daysArr.map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = dayStart + 86_400_000;
    const dayEvents = events.filter((e) => e.createdAt.getTime() >= dayStart && e.createdAt.getTime() < dayEnd);
    const dayVisits = new Set(dayEvents.filter((e) => e.eventType === "PAGE_VIEW").map((e) => e.sessionId).filter(Boolean));
    const dayOrders = dailyPurchases.filter(
      (o) => o.createdAt.getTime() >= dayStart && o.createdAt.getTime() < dayEnd,
    );
    return {
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "dd/MM"),
      visitors: dayVisits.size,
      pageViews: dayEvents.filter((e) => e.eventType === "PAGE_VIEW").length,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
    };
  });

  const stats = {
    visitors: visitorsCount,
    sessions: visitorsCount,
    pageViews: counts.get("PAGE_VIEW") ?? 0,
    addToCart: counts.get("ADD_TO_CART") ?? 0,
    checkoutsStarted: counts.get("BEGIN_CHECKOUT") ?? 0,
    abandoned,
    orders: orderStats._count,
    revenue: Number(revenue),
    purchaseEvents: counts.get("PURCHASE") ?? 0,
  };

  return (
    <div className="space-y-6">
      <AnalyticsView range={range} stats={stats} series={series} />
    </div>
  );
}
