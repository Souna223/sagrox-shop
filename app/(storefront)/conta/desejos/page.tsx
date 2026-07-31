import type { Metadata } from "next";
import { WishlistView } from "@/components/conta/wishlist-view";

export const metadata: Metadata = {
  title: "Lista de desejos",
};

export default function WishlistPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Lista de desejos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Produtos salvos para comprar depois.
      </p>
      <WishlistView />
    </div>
  );
}
