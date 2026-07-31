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

const LINKS = [
  { href: "/conta", label: "Início", icon: Home, exact: true },
  { href: "/conta/pedidos", label: "Meus pedidos", icon: Package },
  { href: "/conta/desejos", label: "Lista de desejos", icon: Heart },
  { href: "/conta/enderecos", label: "Endereços", icon: MapPin },
  { href: "/conta/dados", label: "Dados pessoais", icon: UserRound },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Menu da conta">
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
        <LogOut className="size-4" /> Sair da conta
      </Button>
    </nav>
  );
}
