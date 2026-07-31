import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

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
    <div className="flex min-h-screen flex-col">
      <Header
        categories={categories}
        announcement={announcement?.message ?? (settings.announcement || null)}
        storeName={settings.storeName}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}
