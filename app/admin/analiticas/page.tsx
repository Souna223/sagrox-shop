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

const RANGES: Record<string, number> = { "1": 1, "7": 7, "30": 30, "90": 90 };

export type TrafficChannel = "paid" | "organic" | "social" | "referral" | "direct";

export function classifyTraffic(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
}): TrafficChannel {
  const s = (input.utmSource ?? "").toLowerCase();
  const m = (input.utmMedium ?? "").toLowerCase();
  const r = (input.referrer ?? "").toLowerCase();

  if (
    m === "cpc" ||
    m === "paid" ||
    m === "ppc" ||
    m === "ads" ||
    m === "shopping" ||
    /ads|paid|cpc/.test(s)
  ) {
    return "paid";
  }

  if (
    m === "organic" ||
    m === "search" ||
    ["google", "bing", "duckduckgo", "yahoo"].includes(s) ||
    /google\.|bing\.|duckduckgo\.|search\.yahoo|br\.search\./.test(r)
  ) {
    return "organic";
  }

  if (
    m === "social" ||
    ["facebook", "instagram", "tiktok", "whatsapp", "youtube", "twitter"].includes(s) ||
    /facebook\.|instagram\.|tiktok\.|wa\.me|whatsapp\.|youtube\.|twitter\.|x\.com/.test(r)
  ) {
    return "social";
  }

  if (r) return "referral";
  return "direct";
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { range = "30" } = await searchParams;
  const days = RANGES[range] ?? 30;
  const since = startOfDay(subDays(new Date(), days - 1));

  const eventTypes = ["PAGE_VIEW", "ADD_TO_CART", "BEGIN_CHECKOUT", "PURCHASE"] as AnalyticsEventType[];

  const [events, orderStats, dailyPurchases] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { eventType: { in: eventTypes }, createdAt: { gte: since } },
      select: {
        eventType: true,
        sessionId: true,
        createdAt: true,
        pagePath: true,
        referrer: true,
        utmSource: true,
        utmMedium: true,
        country: true,
      },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "APPROVED", createdAt: { gte: since } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "APPROVED", createdAt: { gte: since } },
      select: { createdAt: true, total: true, utmSource: true, utmMedium: true },
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

  // Páginas mais visitadas
  const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (const e of events) {
    if (e.eventType !== "PAGE_VIEW") continue;
    const path = e.pagePath || "/";
    const rec = pageMap.get(path) ?? { views: 0, visitors: new Set<string>() };
    rec.views += 1;
    if (e.sessionId) rec.visitors.add(e.sessionId);
    pageMap.set(path, rec);
  }
  const pages = [...pageMap.entries()]
    .map(([path, rec]) => ({ path, views: rec.views, visitors: rec.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  // Países de origem das visitas
  const countryMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (const e of events) {
    if (e.eventType !== "PAGE_VIEW") continue;
    const country = e.country ?? "unknown";
    const rec = countryMap.get(country) ?? { views: 0, visitors: new Set<string>() };
    rec.views += 1;
    if (e.sessionId) rec.visitors.add(e.sessionId);
    countryMap.set(country, rec);
  }
  const countries = [...countryMap.entries()]
    .map(([country, rec]) => ({ country, views: rec.views, visitors: rec.visitors.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);

  // Canal de tráfego por sessão (primeiro evento da sessão define o canal)
  const sessionChannel = new Map<string, TrafficChannel>();
  for (const e of events) {
    if (!e.sessionId || sessionChannel.has(e.sessionId)) continue;
    sessionChannel.set(e.sessionId, classifyTraffic(e));
  }

  const emptyChannel = { visitors: 0, views: 0, orders: 0, revenue: 0 };
  const channelStats: Record<TrafficChannel, typeof emptyChannel> = {
    paid: { ...emptyChannel },
    organic: { ...emptyChannel },
    social: { ...emptyChannel },
    referral: { ...emptyChannel },
    direct: { ...emptyChannel },
  };

  for (const ch of sessionChannel.values()) channelStats[ch].visitors += 1;
  for (const e of events) {
    if (e.eventType === "PAGE_VIEW") channelStats[classifyTraffic(e)].views += 1;
  }
  for (const o of dailyPurchases) {
    const ch = classifyTraffic({ utmSource: o.utmSource, utmMedium: o.utmMedium });
    channelStats[ch].orders += 1;
    channelStats[ch].revenue += Number(o.total);
  }

  const channels = (Object.keys(channelStats) as TrafficChannel[]).map((key) => ({
    key,
    ...channelStats[key],
  }));

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
    paidVisitors: channelStats.paid.visitors,
    paidRevenue: channelStats.paid.revenue,
    organicVisitors: channelStats.organic.visitors,
    organicRevenue: channelStats.organic.revenue,
  };

  return (
    <div className="space-y-6">
      <AnalyticsView
        range={range}
        stats={stats}
        series={series}
        pages={pages}
        channels={channels}
        countries={countries}
      />
    </div>
  );
}
