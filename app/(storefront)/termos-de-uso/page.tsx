import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/storefront/legal-page";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.termsTitle,
    description: t.pages.termsDescription,
  };
}

export default async function TermsOfUsePage() {
  const t = await getDictionary();

  return (
    <LegalPage
      title={t.pages.termsTitle}
      description={t.pages.termsDescription}
      updated={t.pages.termsUpdated}
      sections={t.pages.termsSections as unknown as LegalSection[]}
    />
  );
}
