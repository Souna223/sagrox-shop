import type { Metadata } from "next";
import { getActiveKits } from "@/lib/kits";
import { KitCard } from "@/components/storefront/kit-card";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.kitsTitle,
    description: t.pages.kitsDescription,
  };
}

export default async function KitsPage() {
  const t = await getDictionary();
  const kits = await getActiveKits();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.kits.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.kits.subtitle}</p>
      </div>

      {kits.length === 0 ? (
        <div className="rounded-xl border bg-muted/40 py-20 text-center">
          <p className="text-muted-foreground">{t.kits.noKits}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {kits.map((kit) => (
            <KitCard
              key={kit.id}
              kit={{
                id: kit.id,
                name: kit.name,
                slug: kit.slug,
                sku: kit.sku,
                description: kit.description,
                image: kit.image,
                unitPrice: kit.unitPrice,
                compareAtPrice: kit.compareAtPrice,
                discountPercent: kit.discountPercent,
                maxQuantity: kit.maxQuantity,
                componentsCount: kit.components.length,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
