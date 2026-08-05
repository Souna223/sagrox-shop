"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/dictionaries";

export function CartPage({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const remaining = freeShippingThreshold > 0 ? freeShippingThreshold - subtotal : null;
  const progress =
    remaining !== null && remaining > 0 ? Math.min(100, (subtotal / freeShippingThreshold) * 100) : 100;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{t.cart.cartEmpty}</h1>
        <p className="text-sm text-muted-foreground">
          {t.cart.addProductsOffers}
        </p>
        <Button size="lg" render={<Link href="/produtos" />}>
          {t.cart.seeProducts}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block" aria-label="Sagrox">
        <Image
          src="/logo.png"
          alt="Sagrox"
          width={1406}
          height={768}
          className="h-10 w-auto object-contain"
        />
      </Link>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">
        {t.cart.myCart}{" "}
        <span className="text-base font-normal text-muted-foreground">{fmt(t.cart.itemsCount, { n: count })}</span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {remaining !== null && remaining > 0 ? (
            <div className="mb-4 rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Truck className="size-4 text-primary" />
                  {fmt(t.cart.freeShippingProgress, { value: formatBRL(remaining) })}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : freeShippingThreshold > 0 ? (
            <div className="mb-4 rounded-xl border bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="flex items-center gap-2">
                <Truck className="size-4" /> {t.cart.youGotFreeShipping}
              </span>
            </div>
          ) : null}

          <ul className="space-y-3">
            {items.map((item) => {
              const info = calcPriceInfo(item.price, item.compareAtPrice);
              return (
                <li
                  key={`${item.kind ?? "product"}:${item.productId}:${item.variationId ?? ""}`}
                  className="flex gap-4 rounded-xl border p-3"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={item.kind === "kit" ? `/kits/${item.slug}` : `/produtos/${item.slug}`}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.kind === "kit" ? (
                        <span className="ml-1 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Kit
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        onClick={() => removeItem(item.productId, item.variationId)}
                        aria-label={t.cart.removeItem}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {item.variationName ? (
                      <p className="text-xs text-muted-foreground">{item.variationName}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(item.productId, item.variationId, item.quantity - 1)
                          }
                          aria-label={t.cart.decrease}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(item.productId, item.variationId, item.quantity + 1)
                          }
                          aria-label={t.cart.increase}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <div className="text-right">
                        {info.hasDiscount ? (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatBRL(item.compareAtPrice! * item.quantity)}
                          </p>
                        ) : null}
                        <p className="font-bold">{formatBRL(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" render={<Link href="/produtos" />}>
              ← {t.cart.continueShopping}
            </Button>
            <Button variant="outline" onClick={() => router.push("/produtos?promocao=1")}>
              {t.cart.seePromotions}
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-xl border p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">{t.cart.summary}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.cart.subtotal}</dt>
              <dd className="font-semibold">{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.cart.shipping}</dt>
              <dd className="text-muted-foreground">{t.cart.calculatedAtCheckout}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.cart.discounts}</dt>
              <dd className="text-muted-foreground">{t.cart.appliedAtCheckout}</dd>
            </div>
          </dl>
          <Button size="lg" className="mt-4 w-full" onClick={() => router.push("/checkout")}>
            {t.cart.checkout} <ArrowRight className="ml-2 size-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t.cart.securePayment}
          </p>
        </aside>
      </div>
    </div>
  );
}
