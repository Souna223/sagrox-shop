"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  Search,
  User,
  Heart,
  ShoppingBag,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store/cart-store";
import type { Category } from "@/generated/prisma/client";
import { SITE_NAME } from "@/lib/constants";
import { CartSheet } from "@/components/storefront/cart-sheet";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { useI18n } from "@/lib/i18n/provider";

type HeaderProps = {
  categories: Category[];
  announcement?: string | null;
  storeName?: string;
};

export function Header({ categories, announcement, storeName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const activeCategories = categories.filter((c) => !c.parentId).slice(0, 8);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/produtos?q=${encodeURIComponent(q)}` : "/produtos");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {announcement ? (
        <div className="bg-primary text-primary-foreground">
          <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
            {announcement}
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t.header.menu} />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <nav className="mt-8 flex flex-col gap-1">
                  {activeCategories.map((c) => (
                    <SheetClose
                      key={c.id}
                      render={
                        <Link
                          href={`/categoria/${c.slug}`}
                          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                        />
                      }
                    >
                      {c.name}
                    </SheetClose>
                  ))}
                  <SheetClose
                    render={
                      <Link
                        href="/produtos"
                        className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      />
                    }
                  >
                    {t.header.allProducts}
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        href="/promocoes"
                        className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      />
                    }
                  >
                    {t.header.promotions}
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        href="/contato"
                        className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      />
                    }
                  >
                    {t.header.contact}
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2" aria-label={storeName ?? SITE_NAME}>
              <Image
                src="/logo.png"
                alt={storeName ?? SITE_NAME}
                width={1406}
                height={768}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          <form onSubmit={submitSearch} className="hidden flex-1 max-w-md lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.header.searchPlaceholder}
                className="pl-9"
                aria-label={t.header.searchPlaceholder}
              />
            </div>
          </form>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={t.header.myAccount}
              render={<Link href="/conta" />}
            >
              <User className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t.header.favorites}
              render={<Link href="/conta/desejos" />}
            >
              <Heart className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={t.header.cart}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 size-5 items-center justify-center rounded-full p-0 text-xs">
                  {cartCount}
                </Badge>
              ) : null}
            </Button>

            <LanguageSwitcher />
          </div>
        </div>

        <nav className="hidden h-12 items-center gap-1 lg:flex" aria-label={t.header.categories}>
          {activeCategories.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted ${
                pathname === `/categoria/${c.slug}` ? "bg-muted" : ""
              }`}
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/promocoes"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-destructive hover:bg-muted"
          >
            {t.header.offers}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="ml-auto text-sm" />}
            >
              {t.header.more} <ChevronDown className="ml-1 size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href="/produtos" />}>{t.header.allProducts}</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/mais-vendidos" />}>{t.header.bestSellers}</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/lancamentos" />}>{t.header.launches}</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contato" />}>{t.header.contact}</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/faq" />}>{t.header.faq}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <form onSubmit={submitSearch} className="pb-3 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.header.searchPlaceholder}
              className="pl-9"
              aria-label={t.header.searchPlaceholder}
            />
          </div>
        </form>
      </div>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
