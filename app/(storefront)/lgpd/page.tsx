import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/storefront/legal-page";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.lgpdTitle,
    description: t.pages.lgpdDescription,
  };
}

export default async function LgpdPage() {
  const t = await getDictionary();

  return (
    <LegalPage
      title={t.pages.lgpdTitle}
      description={t.pages.lgpdDescription}
      updated={t.pages.lgpdUpdated}
      sections={t.pages.lgpdSections as unknown as LegalSection[]}
    />
  );
}
