"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { formatBRL } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

export function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            {t.cart.myCart}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{t.cart.cartEmpty}</p>
              <p className="text-sm text-muted-foreground">{t.cart.addProducts}</p>
            </div>
            <Button render={<Link href="/produtos" />} onClick={() => onOpenChange(false)}>
              {t.cart.seeProducts}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={`${item.kind ?? "product"}:${item.productId}:${item.variationId ?? ""}`}
                    className="flex gap-3"
                  >
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={item.kind === "kit" ? `/kits/${item.slug}` : `/produtos/${item.slug}`}
                          onClick={() => onOpenChange(false)}
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
                          className="size-7 text-muted-foreground"
                          onClick={() => removeItem(item.productId, item.variationId)}
                          aria-label={t.cart.removeItem}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {item.variationName ? (
                        <p className="text-xs text-muted-foreground">{item.variationName}</p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-md border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() =>
                              updateQuantity(item.productId, item.variationId, item.quantity - 1)
                            }
                            aria-label={t.cart.decrease}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() =>
                              updateQuantity(item.productId, item.variationId, item.quantity + 1)
                            }
                            aria-label={t.cart.increase}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold">{formatBRL(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">{t.cart.subtotal}</span>
                <span className="font-semibold">{formatBRL(subtotal)}</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t.cart.shippingAtCheckout}
              </p>
              <Button className="w-full" render={<Link href="/checkout" />} onClick={() => onOpenChange(false)}>
                {t.cart.checkout} <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button
                variant="link"
                className="mt-2 w-full"
                render={<Link href="/carrinho" />}
                onClick={() => onOpenChange(false)}
              >
                {t.cart.viewFullCart}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
