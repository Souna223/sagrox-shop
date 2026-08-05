"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShoppingCart, Zap, Minus, Plus, PackageCheck, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";
import type { ResolvedKit } from "@/lib/kits";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";
import { trackClient } from "@/lib/client-tracking";

export function KitDetail({ kit }: { kit: ResolvedKit }) {
  const router = useRouter();
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);

  const info = useMemo(() => calcPriceInfo(kit.unitPrice, kit.compareAtPrice), [kit]);
  const soldOut = kit.maxQuantity <= 0;

  const handleAddToCart = (buyNow = false) => {
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
      quantity,
    );
    trackClient("ADD_TO_CART", { productId: kit.id, value: kit.unitPrice * quantity });
    toast.success(t.kits.addedToCart);
    if (buyNow) router.push("/checkout");
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
          {kit.image ? (
            <Image
              src={kit.image}
              alt={kit.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">{t.kits.noImage}</div>
          )}
          {info.hasDiscount ? (
            <Badge className="absolute left-3 top-3 bg-destructive text-destructive-foreground">
              -{info.discountPercent}%
            </Badge>
          ) : null}
          <Badge variant="secondary" className="absolute right-3 top-3">
            {t.kits.kitBadge}
          </Badge>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{kit.name}</h1>

        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>SKU: {kit.sku}</span>
          <span>•</span>
          <span>{fmt(t.kits.itemsIncluded, { n: kit.components.length })}</span>
        </div>

        <div className="mt-5">
          {info.hasDiscount ? (
            <p className="text-sm text-muted-foreground line-through">{formatBRL(info.compareAtPrice)}</p>
          ) : null}
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold">{formatBRL(kit.unitPrice)}</p>
            {info.hasDiscount ? (
              <Badge variant="secondary">
                {fmt(t.productDetail.economy, { value: formatBRL(info.compareAtPrice! - info.price) })}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(t.productDetail.installmentNoInterest, {
              x: info.installment,
              y: formatBRL(info.installmentValue),
            })}
          </p>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">{t.kits.itemsIncludedTitle}</p>
          <ul className="space-y-2">
            {kit.components.map((c) => {
              const unavailable = c.stock <= 0;
              return (
                <li
                  key={`${c.productId}:${c.variationId ?? ""}`}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                    unavailable ? "opacity-60" : ""
                  }`}
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(t.kits.quantityLabel, { n: c.quantity })}
                      {unavailable ? ` • ${t.kits.soldOut}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatBRL(c.unitPrice)}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.kits.totalSeparately} {formatBRL(kit.basePrice)}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={soldOut}
              aria-label={t.productDetail.decreaseQty}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setQuantity((q) => Math.min(kit.maxQuantity, q + 1))}
              disabled={soldOut}
              aria-label={t.productDetail.increaseQty}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <Button size="lg" className="flex-1 sm:flex-none" onClick={() => handleAddToCart()} disabled={soldOut}>
            <ShoppingCart className="size-4" /> {t.kits.addToCart}
          </Button>
          <Button size="lg" variant="secondary" className="flex-1 sm:flex-none" onClick={() => handleAddToCart(true)} disabled={soldOut}>
            <Zap className="size-4" /> {t.kits.buyNow}
          </Button>
        </div>

        {soldOut ? (
          <p className="mt-3 text-sm font-medium text-destructive">{t.kits.outOfStockNow}</p>
        ) : kit.maxQuantity <= 5 ? (
          <p className="mt-3 text-sm font-medium text-orange-600">
            {fmt(t.kits.onlyLeft, { n: kit.maxQuantity })}
          </p>
        ) : null}

        {kit.description ? (
          <div className="prose mt-6 max-w-none rounded-xl border p-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {kit.description.split("\n").map((line, i) => (
              <p key={i} className="mb-3">
                {line}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <span>{t.productDetail.checkShippingAtCheckout}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>{t.productDetail.securePurchase}</span>
          </div>
          <div className="flex items-center gap-2">
            <PackageCheck className="size-4 text-primary" />
            <span>{t.productDetail.weShipBrazil}</span>
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-primary" />
            <span>{t.productDetail.easyExchange}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
