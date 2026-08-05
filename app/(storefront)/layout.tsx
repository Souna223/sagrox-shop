import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { AnalyticsTracker } from "@/components/storefront/analytics-tracker";
import { WhatsAppWidget } from "@/components/storefront/whatsapp-widget";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { I18nProvider } from "@/lib/i18n/provider";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings, announcement] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    getSettings(),
    prisma.announcement
      .findFirst({
        where: {
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
      })
      .catch(() => null),
  ]);

  return (
    <I18nProvider>
      <AnalyticsTracker />
      <div className="flex min-h-screen flex-col">
        <Header
          categories={categories}
          announcement={announcement?.message ?? (settings.announcement || null)}
          storeName={settings.storeName}
        />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <WhatsAppWidget whatsapp={settings.whatsapp} />
      </div>
    </I18nProvider>
  );
}
