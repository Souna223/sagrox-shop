"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  Star,
  ShieldCheck,
  Minus,
  Plus,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { toast } from "sonner";
import type { ProductDetailData } from "@/lib/products";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";
import { trackClient } from "@/lib/client-tracking";

export function ProductDetail({ product }: { product: ProductDetailData }) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const variation = useMemo(
    () => product.variations.find((v) => v.id === selectedVariationId) ?? null,
    [product.variations, selectedVariationId],
  );

  const price = variation?.price ?? product.price;
  const compareAtPrice = variation?.compareAtPrice ?? product.compareAtPrice;
  const stock = variation?.stock ?? product.stock;
  const sku = variation?.sku ?? product.sku;

  const info = calcPriceInfo(price, compareAtPrice);
  const images = product.images.length > 0 ? product.images : null;
  const mainImage = variation?.imageUrl ?? images?.[selectedImage]?.url;
  const inWishlist = wishlist.includes(product.id);
  const soldOut = stock <= 0;

  const handleAddToCart = (buyNow = false) => {
    if (soldOut) {
      toast.error(t.productDetail.outOfStock);
      return;
    }
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: variation ? `${product.name} — ${variation.name}` : product.name,
        sku,
        variationId: variation?.id,
        variationName: variation?.name,
        price,
        compareAtPrice,
        image: mainImage ?? "",
        stock,
      },
      quantity,
    );
    trackClient("ADD_TO_CART", { productId: product.id, value: price * quantity });
    toast.success(t.productDetail.addedToCart);
    if (buyNow) router.push("/checkout");
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.images.find((i) => i.url === mainImage)?.alt ?? product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t.productDetail.noImage}
            </div>
          )}
          {info.hasDiscount ? (
            <Badge className="absolute left-3 top-3 bg-destructive text-destructive-foreground">
              -{info.discountPercent}%
            </Badge>
          ) : null}
        </div>

        {images && images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImage(i)}
                className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border bg-muted ${
                  i === selectedImage ? "ring-2 ring-primary" : ""
                }`}
                aria-label={fmt(t.productDetail.viewImage, { n: i + 1 })}
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            {product.brand ? (
              <p className="text-sm font-medium text-primary">{product.brand.name}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
            {product.shortDescription ? (
              <p className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</p>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="icon"
            className={`shrink-0 ${inWishlist ? "bg-rose-500 text-white hover:bg-rose-500" : ""}`}
            onClick={() => toggleWishlist(product.id)}
            aria-label={inWishlist ? t.productDetail.removeFromFavorites : t.productDetail.addToFavorites}
          >
            <Heart className={`size-5 ${inWishlist ? "fill-current" : ""}`} />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-semibold text-foreground">
              {product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : "—"}
            </span>
          </span>
          <span className="text-muted-foreground">
            {fmt(t.productDetail.reviewsCount, {
              n: product.ratingCount > 0 ? product.ratingCount : 0,
            })}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">SKU: {sku}</span>
          <a
            href="#review-form"
            className="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.productDetail.rateNow}
          </a>
        </div>

        <div className="mt-5">
          {info.hasDiscount ? (
            <p className="text-sm text-muted-foreground line-through">{formatBRL(compareAtPrice)}</p>
          ) : null}
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold">{formatBRL(price)}</p>
            {info.hasDiscount ? (
              <Badge variant="secondary">
                {fmt(t.productDetail.economy, {
                  value: formatBRL((compareAtPrice ?? price) - price),
                })}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(t.productDetail.installmentNoInterest, {
              x: info.installment,
              y: formatBRL(info.installmentValue),
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-emerald-600">{t.productDetail.pixDiscount}</span> {t.productDetail.orBoleto}
          </p>
        </div>

        {product.variations.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">
              {t.productDetail.options}{" "}
              <span className="font-normal text-muted-foreground">{variation?.name ?? t.productDetail.select}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variations.map((v) => {
                const active = v.id === selectedVariationId;
                const unavailable = (v.stock ?? 0) <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariationId(active ? null : v.id);
                      setQuantity(1);
                    }}
                    disabled={unavailable}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50"
                    }`}
                  >
                    {v.name}
                    {unavailable ? ` ${t.productDetail.soldOut}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
              onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
              disabled={soldOut}
              aria-label={t.productDetail.increaseQty}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <Button size="lg" className="flex-1 sm:flex-none" onClick={() => handleAddToCart()} disabled={soldOut}>
            <ShoppingCart className="size-4" /> {t.productDetail.addToCart}
          </Button>
          <Button size="lg" variant="secondary" className="flex-1 sm:flex-none" onClick={() => handleAddToCart(true)} disabled={soldOut}>
            <Zap className="size-4" /> {t.productDetail.buyNow}
          </Button>
        </div>

        {soldOut ? (
          <p className="mt-3 text-sm font-medium text-destructive">{t.productDetail.soldOutNow}</p>
        ) : stock <= 10 ? (
          <p className="mt-3 text-sm font-medium text-orange-600">
            {fmt(t.productDetail.onlyLeft, { n: stock })}
          </p>
        ) : null}

        <div className="mt-6 grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            <span>{product.freeShipping ? t.productDetail.freeShippingBrazil : t.productDetail.checkShippingAtCheckout}</span>
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

        {product.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Link
                key={tag}
                href={`/produtos?q=${encodeURIComponent(tag)}`}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProductDescriptionTabs({ product }: { product: ProductDetailData }) {
  const { t } = useI18n();
  const hasAttributes = product.attributes && Object.keys(product.attributes).length > 0;

  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of product.reviews) counts[r.rating - 1] = (counts[r.rating - 1] ?? 0) + 1;
    return counts;
  }, [product.reviews]);

  return (
    <Tabs defaultValue="description" className="mt-12">
      <TabsList>
        <TabsTrigger value="description">{t.productDetail.description}</TabsTrigger>
        {hasAttributes ? <TabsTrigger value="specs">{t.productDetail.specs}</TabsTrigger> : null}
        <TabsTrigger value="reviews">
          {t.productDetail.reviews} ({product.ratingCount > 0 ? product.ratingCount : product.reviews.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="pt-4">
        <div className="prose max-w-none text-sm leading-relaxed text-muted-foreground sm:text-base">
          {product.description ? (
            product.description.split("\n").map((line, i) => (
              <p key={i} className="mb-3">
                {line}
              </p>
            ))
          ) : (
            <p>{t.productDetail.noDescription}</p>
          )}
        </div>
      </TabsContent>

      {hasAttributes ? (
        <TabsContent value="specs" className="pt-4">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(product.attributes as Record<string, unknown>).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="w-1/3 bg-muted/50 px-4 py-2.5 font-medium">{key}</td>
                    <td className="px-4 py-2.5">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      ) : null}

      <TabsContent value="reviews" className="pt-4">
        {product.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.productDetail.noReviewsYet}
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-[220px_1fr]">
            <div>
              <div className="flex items-end gap-2">
                <p className="text-5xl font-bold">
                  {product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : "—"}
                </p>
                <div className="pb-1 text-amber-500">
                  <Star className="size-6 fill-current" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {ratingCounts.map((count, i) => {
                  const star = 5 - i;
                  const total = product.reviews.length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-8">{star} ★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ul className="space-y-4">
              {product.reviews.map((review) => (
                <li key={review.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(review.userName ?? "C").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{review.userName ?? t.productDetail.customer}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={`size-3.5 ${s < review.rating ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                  </div>
                  {review.title ? <p className="mt-2 text-sm font-semibold">{review.title}</p> : null}
                  {review.comment ? <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
