import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AccountNav } from "@/components/conta/account-nav";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr] lg:gap-10">
      <aside className="md:sticky md:top-24 md:self-start">
        <div className="mb-4 px-3">
          <p className="truncate text-sm font-semibold">{user.name ?? "Olá!"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <AccountNav />
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
