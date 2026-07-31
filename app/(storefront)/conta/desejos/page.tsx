import type { Metadata } from "next";
import { WishlistView } from "@/components/conta/wishlist-view";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.wishlistTitle,
  };
}

export default async function WishlistPage() {
  const t = await getDictionary();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t.account.wishlist}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t.account.wishlistDesc}
      </p>
      <WishlistView />
    </div>
  );
}
