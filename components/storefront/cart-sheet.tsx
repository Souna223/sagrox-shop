"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { formatBRL } from "@/lib/format";

export function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
            Meu carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Seu carrinho está vazio</p>
              <p className="text-sm text-muted-foreground">Adicione produtos para continuar.</p>
            </div>
            <Button render={<Link href="/produtos" />} onClick={() => onOpenChange(false)}>
              Ver produtos
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={`${item.productId}:${item.variationId ?? ""}`} className="flex gap-3">
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
                          href={`/produtos/${item.slug}`}
                          onClick={() => onOpenChange(false)}
                          className="line-clamp-2 text-sm font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          onClick={() => removeItem(item.productId, item.variationId)}
                          aria-label="Remover item"
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
                            aria-label="Diminuir"
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
                            aria-label="Aumentar"
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
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatBRL(subtotal)}</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Frete e descontos calculados no checkout.
              </p>
              <Button className="w-full" render={<Link href="/checkout" />} onClick={() => onOpenChange(false)}>
                Finalizar compra <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button
                variant="link"
                className="mt-2 w-full"
                render={<Link href="/carrinho" />}
                onClick={() => onOpenChange(false)}
              >
                Ver carrinho completo
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
