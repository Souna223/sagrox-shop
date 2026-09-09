import type { Metadata } from "next";
import { requireAdmin } from "@/lib/api";
import { getAdsSettings } from "@/lib/ads";
import { AdSettingsForm } from "@/components/admin/ad-settings-form";

export const metadata: Metadata = {
  title: "Anúncios Meta",
};

export default async function AdminAdsMetaPage() {
  await requireAdmin();
  const settings = await getAdsSettings();

  return <AdSettingsForm platform="meta" platformLabel="Meta Ads" initial={settings} />;
}