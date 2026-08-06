import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { ProductCarousel } from "@/components/storefront/product-carousel";
import { KitCard } from "@/components/storefront/kit-card";
import {
  getFeaturedProducts,
  getDiscountedProducts,
  getActiveFlashSales,
} from "@/lib/products";
import { getActiveKits } from "@/lib/kits";
import { prisma } from "@/lib/prisma";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.pages.homeTitle };
}

export default async function HomePage() {
  const t = await getDictionary();
  const [featured, discounted, flashSales, categories, kits] =
    await Promise.all([
      getFeaturedProducts(8),
      getDiscountedProducts(8),
      getActiveFlashSales(),
      prisma.category.findMany({
        where: { active: true, parentId: null },
        include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
        orderBy: { sortOrder: "asc" },
        take: 6,
      }),
      getActiveKits(),
    ]);

  return (
    <div>
      <Hero t={t} featured={featured} />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <TrustBar t={t} />
      </section>

      {categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <SectionHeader title={t.home.categories} href="/produtos" linkLabel={t.home.viewAll} />
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
                    {category._count.products} {t.home.productsCount}
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
            <SectionHeader title={t.home.flashSales} href="/promocoes" linkLabel={t.home.seeDeals} />
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

      {discounted.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <SectionHeader title={t.home.promotions} href="/promocoes" linkLabel={t.home.seeDeals} />
          <ProductGrid products={discounted} />
        </section>
      ) : null}

      {kits.length > 0 ? (
        <section className="bg-muted/40 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader title={t.home.kits} href="/kits" linkLabel={t.home.viewAll} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {kits.map((kit) => (
                <KitCard
                  key={kit.id}
                  kit={{
                    id: kit.id,
                    name: kit.name,
                    slug: kit.slug,
                    sku: kit.sku,
                    description: kit.description,
                    image: kit.image,
                    unitPrice: kit.unitPrice,
                    compareAtPrice: kit.compareAtPrice,
                    discountPercent: kit.discountPercent,
                    maxQuantity: kit.maxQuantity,
                    componentsCount: kit.components.length,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <NewsletterForm />
      </section>
    </div>
  );
}

function Hero({ t, featured }: { t: Dictionary; featured: ProductCardData[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-3 inline-flex items-center rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide">
            {t.home.freeShippingBadge}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-lg text-primary-foreground/80">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" render={<Link href="/produtos" />}>
              {t.home.buyNow} <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              render={<Link href="/promocoes" />}
            >
              {t.home.seeOffers}
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary-foreground/10 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { label: t.home.paymentUpTo, value: t.home.upTo12x },
                { label: t.home.pixWith, value: t.home.pix5off },
                { label: t.home.delivery, value: t.home.allBrazil },
                { label: t.home.purchase, value: t.home.secure100 },
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

      {featured.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary-foreground">{t.home.featured}</h2>
          </div>
          <ProductCarousel products={featured.slice(0, 8)} />
        </div>
      ) : null}
    </section>
  );
}

function TrustBar({ t }: { t: Dictionary }) {
  const items = [
    { icon: ShieldCheck, title: t.home.secureTitle, subtitle: t.home.secureSubtitle },
    { icon: Truck, title: t.home.fastTitle, subtitle: t.home.fastSubtitle },
    { icon: CreditCard, title: t.home.installmentsTitle, subtitle: t.home.installmentsSubtitle },
    { icon: Headset, title: t.home.supportTitle, subtitle: t.home.supportSubtitle },
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
