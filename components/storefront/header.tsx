"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Search,
  User,
  Heart,
  ShoppingBag,
  ChevronDown,
  LogOut,
  Package,
  Settings,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store/cart-store";
import type { Category } from "@/generated/prisma/client";
import { SITE_NAME } from "@/lib/constants";
import { CartSheet } from "@/components/storefront/cart-sheet";

type HeaderProps = {
  categories: Category[];
  announcement?: string | null;
  storeName?: string;
};

export function Header({ categories, announcement, storeName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    if (session?.user?.name) {
      // noop
    }
  }, [session]);

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
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" />
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
                    Todos os produtos
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        href="/promocoes"
                        className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      />
                    }
                  >
                    Promoções
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        href="/contato"
                        className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      />
                    }
                  >
                    Contato
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2" aria-label={storeName ?? SITE_NAME}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingBag className="size-5" />
              </span>
              <span className="hidden text-xl font-bold tracking-tight sm:block">
                {storeName ?? SITE_NAME}
              </span>
            </Link>
          </div>

          <form onSubmit={submitSearch} className="hidden flex-1 max-w-md lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="pl-9"
                aria-label="Buscar produtos"
              />
            </div>
          </form>

          <div className="flex items-center gap-1">
            {status === "loading" ? null : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="rounded-full" aria-label="Minha conta" />
                  }
                >
                  <User className="size-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate">{session.user.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{session.user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/conta" />}>
                    <Settings className="size-4" /> Minha conta
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/conta/pedidos" />}>
                    <Package className="size-4" /> Meus pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/conta/desejos" />}>
                    <Heart className="size-4" /> Lista de desejos
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/conta/enderecos" />}>
                    <MapPin className="size-4" /> Endereços
                  </DropdownMenuItem>
                  {["ADMIN", "MANAGER", "EMPLOYEE"].includes(session.user.role) ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/admin" />}>
                        <Settings className="size-4" /> Painel admin
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Entrar"
                render={<Link href="/login" />}
              >
                <User className="size-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Lista de desejos"
              render={<Link href="/conta/desejos" />}
            >
              <Heart className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Carrinho"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 size-5 items-center justify-center rounded-full p-0 text-xs">
                  {cartCount}
                </Badge>
              ) : null}
            </Button>
          </div>
        </div>

        <nav className="hidden h-12 items-center gap-1 lg:flex" aria-label="Categorias">
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
            Ofertas
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="ml-auto text-sm" />}
            >
              Mais <ChevronDown className="ml-1 size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href="/produtos" />}>Todos os produtos</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/mais-vendidos" />}>Mais vendidos</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/lancamentos" />}>Lançamentos</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contato" />}>Contato</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/faq" />}>Dúvidas frequentes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <form onSubmit={submitSearch} className="pb-3 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9"
              aria-label="Buscar produtos"
            />
          </div>
        </form>
      </div>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
