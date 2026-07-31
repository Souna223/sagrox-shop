import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import {
  getFeaturedProducts,
  getBestSellers,
  getNewProducts,
  getDiscountedProducts,
  getActiveFlashSales,
} from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { NewsletterForm } from "@/components/storefront/newsletter-form";

export const metadata = {
  title: "Início",
};

export default async function HomePage() {
  const [featured, bestSellers, newProducts, discounted, flashSales, categories] =
    await Promise.all([
      getFeaturedProducts(8),
      getBestSellers(8),
      getNewProducts(8),
      getDiscountedProducts(8),
      getActiveFlashSales(),
      prisma.category.findMany({
        where: { active: true, parentId: null },
        include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
        orderBy: { sortOrder: "asc" },
        take: 6,
      }),
    ]);

  return (
    <div>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <TrustBar />
      </section>

      {categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <SectionHeader title="Categorias" href="/produtos" linkLabel="Ver tudo" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categoria/${category.slug}`}
                className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square bg-muted">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {category.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-semibold">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category._count.products} produto{category._count.products === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {flashSales.length > 0 ? (
        <section className="bg-destructive/5 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader title="⚡ Ofertas relâmpago" href="/promocoes" linkLabel="Ver ofertas" />
            {flashSales.map((flashSale) => (
              <div key={flashSale.id}>
                <h3 className="mb-4 text-lg font-semibold">{flashSale.title}</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {flashSale.products.slice(0, 5).map(({ product }) => (
                    <ProductCard key={product.id} product={product as ProductCardData} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader title="Destaques" href="/produtos" linkLabel="Ver todos" />
          <ProductGrid products={featured} />
        </section>
      ) : null}

      {discounted.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <SectionHeader title="Promoções" href="/promocoes" linkLabel="Ver ofertas" />
          <ProductGrid products={discounted} />
        </section>
      ) : null}

      {bestSellers.length > 0 ? (
        <section className="bg-muted/40 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader title="Mais vendidos" href="/mais-vendidos" linkLabel="Ver todos" />
            <ProductGrid products={bestSellers} />
          </div>
        </section>
      ) : null}

      {newProducts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader title="Novidades" href="/lancamentos" linkLabel="Ver todos" />
          <ProductGrid products={newProducts} />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <NewsletterForm />
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-3 inline-flex items-center rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
            Frete grátis acima de R$ 299
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            As melhores ofertas para você comprar online
          </h1>
          <p className="mt-4 max-w-lg text-primary-foreground/80">
            Pagamento em até 12x, Pix com desconto e entrega para todo o Brasil.
            Compre com segurança e receba no conforto da sua casa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" render={<Link href="/produtos" />}>
              Comprar agora <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              render={<Link href="/promocoes" />}
            >
              Ver ofertas
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary-foreground/10 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { label: "Pagamento em até", value: "12x" },
                { label: "Pix com", value: "5% off" },
                { label: "Entrega", value: "Todo Brasil" },
                { label: "Compra", value: "100% segura" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-6 backdrop-blur"
                >
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: ShieldCheck, title: "Compra segura", subtitle: "Pagamento criptografado" },
    { icon: Truck, title: "Entrega rápida", subtitle: "Para todo o Brasil" },
    { icon: CreditCard, title: "12x sem juros", subtitle: "Pix, boleto e cartão" },
    { icon: Headset, title: "Suporte", subtitle: "Atendimento humano" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, subtitle }) => (
        <div key={title} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  );
}
