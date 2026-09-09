import type { Metadata } from "next";
import { requireAdmin } from "@/lib/api";
import { getAdsAnalytics, type AdsAnalyticsRange } from "@/lib/ads-analytics";
import { AdsAnalyticsView } from "@/components/admin/ads-analytics-view";

export const metadata: Metadata = {
  title: "Analíticas Meta",
};

export default async function AdminAdsMetaAnaliticasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range = "30" } = await searchParams;
  const validRange = (["7", "30", "90"] as AdsAnalyticsRange[]).includes(range as AdsAnalyticsRange)
    ? (range as AdsAnalyticsRange)
    : "30";
  const data = await getAdsAnalytics("meta", Number(validRange));

  return <AdsAnalyticsView platform="meta" range={validRange} data={data} />;
}