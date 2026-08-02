"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  TicketPercent,
  Star,
  Megaphone,
  Settings,
  ScrollText,
  Store,
  ChevronRight,
  BarChart3,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/analiticas", label: "Analíticas", icon: BarChart3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/fulfillment", label: "Fulfillment", icon: PackageCheck },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/admin/conteudo", label: "Marketing e conteúdo", icon: Megaphone },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, roles: ["ADMIN"] },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["ADMIN"] },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visible = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <nav className="flex flex-col gap-1" aria-label="Menu administrativo">
      {visible.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
              active ? "bg-primary/10 text-primary" : "text-foreground/80",
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="size-4" />
              {item.label}
            </span>
            {active ? <ChevronRight className="size-3.5 text-primary" /> : null}
          </Link>
        );
      })}
      <div className="mt-2 border-t pt-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:bg-muted"
          render={<Link href="/" />}
        >
          <Store className="size-4" /> Ver loja
        </Button>
      </div>
    </nav>
  );
}
