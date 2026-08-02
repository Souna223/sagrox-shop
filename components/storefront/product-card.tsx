"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Truck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";
import { trackClient } from "@/lib/client-tracking";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  price: string | number | { toString(): string };
  compareAtPrice?: string | number | { toString(): string } | null;
  stock: number;
  freeShipping?: boolean;
  ratingAvg?: string | number | { toString(): string };
  ratingCount?: number;
  isNew?: boolean;
  images?: { url: string; alt: string | null }[];
  brand?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
};

function toNumber(v: string | number | { toString(): string } | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const { t } = useI18n();
  const price = toNumber(product.price);
  const compareAt = toNumber(product.compareAtPrice);
  const rating = toNumber(product.ratingAvg);
  const info = calcPriceInfo(price, compareAt);
  const image = product.images?.[0]?.url;
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist = wishlist.includes(product.id);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error(t.productCard.outOfStock);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      price,
      compareAtPrice: compareAt || null,
      image: image ?? "",
      stock: product.stock,
    });
    trackClient("ADD_TO_CART", { productId: product.id, value: price });
    toast.success(t.productCard.addedToCart);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
      <Link href={`/produtos/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.images?.[0]?.alt ?? product.name}
            fill
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">{t.productCard.noImage}</div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {info.hasDiscount ? (
            <Badge className="bg-destructive text-destructive-foreground">
              -{info.discountPercent}%
            </Badge>
          ) : null}
          {product.isNew ? (
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              {t.productCard.new}
            </Badge>
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="icon"
          className={`absolute right-2 top-2 size-8 ${inWishlist ? "bg-rose-500 text-white hover:bg-rose-500" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          aria-label={inWishlist ? t.productCard.removeFromFavorites : t.productCard.addToFavorites}
        >
          <Heart className={`size-4 ${inWishlist ? "fill-current" : ""}`} />
        </Button>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand ? (
          <p className="text-xs text-muted-foreground">{product.brand.name}</p>
        ) : null}
        <Link
          href={`/produtos/${product.slug}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {product.name}
        </Link>

        {rating > 0 ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="flex items-center text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-3 ${i < Math.round(rating) ? "fill-current" : "opacity-30"}`} />
              ))}
            </span>
            <span className="text-muted-foreground">
              {rating.toFixed(1)} ({product.ratingCount ?? 0})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 opacity-30" />
            <span>{t.productCard.noReviews}</span>
          </div>
        )}

        <div className="mt-auto pt-2">
          {info.hasDiscount ? (
            <p className="text-xs text-muted-foreground line-through">{formatBRL(info.compareAtPrice!)}</p>
          ) : null}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold">{formatBRL(price)}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(t.productCard.installmentOf, { x: info.installment, y: formatBRL(info.installmentValue) })}
              </p>
            </div>
            <Button
              size="icon"
              className="size-9 shrink-0"
              onClick={handleAddToCart}
              aria-label={t.productCard.addToCart}
            >
              <ShoppingCart className="size-4" />
            </Button>
          </div>
          {product.freeShipping ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Truck className="size-3.5" /> {t.productCard.freeShipping}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
