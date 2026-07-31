import { redirect } from "next/navigation";
import { Menu } from "lucide-react";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/api";
import { SITE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">{SITE_NAME}</p>
            <p className="text-xs text-muted-foreground">Painel administrativo</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b bg-background px-4 py-2 lg:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <div className="mt-6">
                <AdminNav />
              </div>
            </SheetContent>
          </Sheet>
          <p className="text-sm font-semibold">{SITE_NAME}</p>
        </div>
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
