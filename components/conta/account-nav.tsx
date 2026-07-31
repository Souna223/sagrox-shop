"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Package,
  Heart,
  MapPin,
  UserRound,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export function AccountNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const LINKS = [
    { href: "/conta", label: t.account.home, icon: Home, exact: true },
    { href: "/conta/pedidos", label: t.account.myOrders, icon: Package },
    { href: "/conta/desejos", label: t.account.wishlist, icon: Heart },
    { href: "/conta/enderecos", label: t.account.addresses, icon: MapPin },
    { href: "/conta/dados", label: t.account.personalData, icon: UserRound },
  ];

  return (
    <nav className="flex flex-col gap-1" aria-label={t.account.accountMenu}>
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
              active ? "bg-primary/10 text-primary" : "text-foreground/80",
            )}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
      <Button
        variant="ghost"
        className="justify-start text-muted-foreground hover:bg-muted hover:text-destructive"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="size-4" /> {t.account.logout}
      </Button>
    </nav>
  );
}
