import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api";
import { AddressList } from "@/components/conta/address-list";

export const metadata: Metadata = {
  title: "Meus endereços",
};

export default async function AddressesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { userId: sessionUser.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Endereços</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gerencie os endereços usados na hora da entrega.
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
