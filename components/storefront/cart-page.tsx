"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { formatBRL } from "@/lib/format";
import { calcPriceInfo } from "@/lib/prices";

export function CartPage({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="text-sm text-muted-foreground">
          Adicione produtos para aproveitar nossas ofertas.
        </p>
        <Button size="lg" render={<Link href="/produtos" />}>
          Ver produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">
        Meu carrinho <span className="text-base font-normal text-muted-foreground">({count} item{count === 1 ? "" : "s"})</span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {remaining !== null && remaining > 0 ? (
            <div className="mb-4 rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Truck className="size-4 text-primary" />
                  Faltam {formatBRL(remaining)} para ganhar <strong>frete grátis</strong>
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
                <Truck className="size-4" /> Você ganhou <strong>frete grátis</strong>!
              </span>
            </div>
          ) : null}

          <ul className="space-y-3">
            {items.map((item) => {
              const info = calcPriceInfo(item.price, item.compareAtPrice);
              return (
                <li key={`${item.productId}:${item.variationId ?? ""}`} className="flex gap-4 rounded-xl border p-3">
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
                      <Link href={`/produtos/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">
                        {item.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        onClick={() => removeItem(item.productId, item.variationId)}
                        aria-label="Remover item"
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
                          aria-label="Diminuir"
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
                          aria-label="Aumentar"
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
              ← Continuar comprando
            </Button>
            <Button variant="outline" onClick={() => router.push("/produtos?promocao=1")}>
              Ver promoções
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-xl border p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumo</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd className="text-muted-foreground">Calculado no checkout</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Descontos</dt>
              <dd className="text-muted-foreground">Aplicados no checkout</dd>
            </div>
          </dl>
          <Button size="lg" className="mt-4 w-full" onClick={() => router.push("/checkout")}>
            Finalizar compra <ArrowRight className="ml-2 size-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pagamento seguro via Appmax — Pix, cartão e boleto.
          </p>
        </aside>
      </div>
    </div>
  );
}
