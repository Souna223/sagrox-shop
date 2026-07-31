import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { AddressList } from "@/components/conta/address-list";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.addressesTitle,
  };
}

export default async function AddressesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const t = await getDictionary();

  const addresses = await prisma.address.findMany({
    where: { userId: sessionUser.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t.account.addresses}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t.account.addressesDesc}
      </p>
      <AddressList
        initial={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          zip: a.zip,
          street: a.street,
          number: a.number,
          complement: a.complement,
          neighborhood: a.neighborhood,
          city: a.city,
          state: a.state,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
