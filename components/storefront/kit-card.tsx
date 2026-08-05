"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";
import { trackClient } from "@/lib/client-tracking";

export type KitCardData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  discountPercent: number;
  maxQuantity: number;
  componentsCount?: number;
};

export function KitCard({ kit, priority = false }: { kit: KitCardData; priority?: boolean }) {
  const { t } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  const info = calcPriceInfo(kit.unitPrice, kit.compareAtPrice);
  const soldOut = kit.maxQuantity <= 0;

  const handleAddToCart = () => {
    if (soldOut) {
      toast.error(t.kits.outOfStock);
      return;
    }
    addItem(
      {
        kind: "kit",
        productId: kit.id,
        slug: kit.slug,
        name: kit.name,
        sku: kit.sku,
        price: kit.unitPrice,
        compareAtPrice: kit.compareAtPrice,
        image: kit.image ?? "",
        stock: kit.maxQuantity,
      },
      1,
    );
    trackClient("ADD_TO_CART", { productId: kit.id, value: kit.unitPrice });
    toast.success(t.kits.addedToCart);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
      <Link href={`/kits/${kit.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {kit.image ? (
          <Image
            src={kit.image}
            alt={kit.name}
            fill
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">{t.kits.noImage}</div>
        )}
        {info.hasDiscount ? (
          <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
            -{info.discountPercent}%
          </Badge>
        ) : null}
        <Badge className="absolute right-2 top-2" variant="secondary">
          {t.kits.kitBadge}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          href={`/kits/${kit.slug}`}
          className="line-clamp-2 text-sm font-medium text-foreground hover:underline"
        >
          {kit.name}
        </Link>

        <p className="text-xs text-muted-foreground">
          {fmt(t.kits.itemsIncluded, { n: kit.componentsCount ?? 0 })}
        </p>

        <div className="mt-auto pt-2">
          {info.hasDiscount ? (
            <p className="text-xs text-muted-foreground line-through">{formatBRL(info.compareAtPrice!)}</p>
          ) : null}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-foreground">{formatBRL(kit.unitPrice)}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(t.productCard.installmentOf, { x: info.installment, y: formatBRL(info.installmentValue) })}
              </p>
            </div>
            <Button
              size="icon"
              className="size-9 shrink-0"
              onClick={handleAddToCart}
              disabled={soldOut}
              aria-label={t.kits.addToCart}
            >
              <ShoppingCart className="size-4" />
            </Button>
          </div>
          {soldOut ? (
            <p className="mt-1 text-xs font-semibold text-destructive">{t.kits.soldOut}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmt(t.kits.available, { n: kit.maxQuantity })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
