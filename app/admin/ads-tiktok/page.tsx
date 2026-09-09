import type { Metadata } from "next";
import { requireAdmin } from "@/lib/api";
import { getAdsSettings } from "@/lib/ads";
import { AdSettingsForm } from "@/components/admin/ad-settings-form";

export const metadata: Metadata = {
  title: "Anúncios TikTok",
};

export default async function AdminAdsTikTokPage() {
  await requireAdmin();
  const settings = await getAdsSettings();

  return <AdSettingsForm platform="tiktok" platformLabel="TikTok Ads" initial={settings} />;
}