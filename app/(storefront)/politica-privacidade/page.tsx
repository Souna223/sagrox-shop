import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/storefront/legal-page";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.privacyTitle,
    description: t.pages.privacyDescription,
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getDictionary();

  return (
    <LegalPage
      title={t.pages.privacyTitle}
      description={t.pages.privacyDescription}
      updated={t.pages.privacyUpdated}
      sections={t.pages.privacySections as unknown as LegalSection[]}
    />
  );
}
