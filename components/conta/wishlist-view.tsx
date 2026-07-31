"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function WishlistView() {
  const ids = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/products/ids?ids=${encodeURIComponent(ids.join(","))}`);
        const data = (await res.json()) as { ok: boolean; data?: ProductCardData[] };
        if (!cancelled) setProducts(data.data ?? []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Carregando lista de desejos...</p>
      </div>
    );
  }

  if (products === null || products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Heart className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">Sua lista de desejos está vazia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Toque no coração dos produtos para salvá-los aqui.
          </p>
        </div>
        <Button render={<Link href="/produtos" />}>
          <ShoppingBag className="size-4" /> Explorar produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {products.length} produto{products.length === 1 ? "" : "s"} na lista
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="relative">
            <ProductCard product={product} />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 rounded-full bg-background/80 text-destructive backdrop-blur"
              aria-label="Remover da lista de desejos"
              onClick={() => {
                remove(product.id);
                toast.success("Removido da lista de desejos");
              }}
            >
              <Heart className="size-4 fill-current" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
