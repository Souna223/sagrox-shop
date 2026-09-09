import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format, eachDayOfInterval } from "date-fns";
import type { AnalyticsEventType } from "@/generated/prisma/enums";

export type AdsPlatform = "meta" | "tiktok";

export function adsPlatformSources(platform: AdsPlatform): string[] {
  return platform === "tiktok"
    ? ["tiktok", "tiktok_ads", "tt"]
    : [
        "facebook",
        "fb",
        "instagram",
        "ig",
        "meta",
        "messenger",
        "facebook_ads",
        "instagram_ads",
        "meta_ads",
      ];
}

export function adsPlatformLabel(platform: AdsPlatform): string {
  return platform === "tiktok" ? "TikTok Ads" : "Meta Ads";
}

export type AdsAnalytics = {
  visitors: number;
  sessions: number;
  pageViews: number;
  addToCart: number;
  checkoutsStarted: number;
  orders: number;
  revenue: number;
  conversion: number;
  series: {
    date: string;
    label: string;
    visitors: number;
    pageViews: number;
    orders: number;
    revenue: number;
  }[];
};

const FUNNEL_EVENTS = [
  "PAGE_VIEW",
  "ADD_TO_CART",
  "BEGIN_CHECKOUT",
] as AnalyticsEventType[];

export async function getAdsAnalytics(
  platform: AdsPlatform,
  days = 30,
): Promise<AdsAnalytics> {
  const since = startOfDay(subDays(new Date(), days - 1));
  const sources = adsPlatformSources(platform);

  const [events, orders] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        eventType: { in: FUNNEL_EVENTS },
        createdAt: { gte: since },
        utmSource: { in: sources, mode: "insensitive" },
      },
      select: {
        eventType: true,
        sessionId: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "APPROVED",
        createdAt: { gte: since },
        utmSource: { in: sources, mode: "insensitive" },
      },
      select: { createdAt: true, total: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1);
  }

  const visitorSessions = new Set(
    events.filter((e) => e.eventType === "PAGE_VIEW").map((e) => e.sessionId).filter(Boolean),
  );
  const addToCartSessions = new Set(
    events.filter((e) => e.eventType === "ADD_TO_CART").map((e) => e.sessionId).filter(Boolean),
  );
  const checkoutSessions = new Set(
    events.filter((e) => e.eventType === "BEGIN_CHECKOUT").map((e) => e.sessionId).filter(Boolean),
  );

  const checkoutsStarted = checkoutSessions.size;
  const sessions = visitorSessions.size;
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const daysArr = eachDayOfInterval({ start: since, end: new Date() });
  const series = daysArr.map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = dayStart + 86_400_000;
    const dayEvents = events.filter(
      (e) => e.createdAt.getTime() >= dayStart && e.createdAt.getTime() < dayEnd,
    );
    const dayOrders = orders.filter(
      (o) => o.createdAt.getTime() >= dayStart && o.createdAt.getTime() < dayEnd,
    );
    const dayVisitors = new Set(
      dayEvents.filter((e) => e.eventType === "PAGE_VIEW").map((e) => e.sessionId).filter(Boolean),
    );
    return {
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "dd/MM"),
      visitors: dayVisitors.size,
      pageViews: dayEvents.filter((e) => e.eventType === "PAGE_VIEW").length,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
    };
  });

  return {
    visitors: sessions,
    sessions,
    pageViews: counts.get("PAGE_VIEW") ?? 0,
    addToCart: addToCartSessions.size,
    checkoutsStarted,
    orders: orders.length,
    revenue,
    conversion: sessions > 0 ? (orders.length / sessions) * 100 : 0,
    series,
  };
}

export const ADS_ANALYTICS_RANGES = ["7", "30", "90"] as const;
export type AdsAnalyticsRange = (typeof ADS_ANALYTICS_RANGES)[number];