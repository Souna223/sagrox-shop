import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KitForm } from "@/components/admin/kit-form";

export const metadata: Metadata = {
  title: "Editar kit",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKitPage({ params }: PageProps) {
  const { id } = await params;

  const kit = await prisma.kit.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, stock: true } },
          variation: { select: { id: true, name: true, sku: true, price: true, stock: true } },
        },
      },
    },
  });

  if (!kit) notFound();

  const initial = {
    id: kit.id,
    name: kit.name,
    slug: kit.slug,
    sku: kit.sku,
    description: kit.description,
    image: kit.image,
    price: kit.price != null ? Number(kit.price) : null,
    discountPercent: kit.discountPercent != null ? Number(kit.discountPercent) : null,
    status: kit.status,
    seoTitle: kit.seoTitle,
    seoDescription: kit.seoDescription,
    items: kit.items.map((item) => ({
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      productName: item.product.name,
      productSku: item.product.sku,
      productPrice: Number(item.product.price),
      productStock: item.product.stock,
      variationName: item.variation?.name ?? null,
      variationSku: item.variation?.sku ?? null,
      variationPrice: item.variation?.price != null ? Number(item.variation.price) : null,
      variationStock: item.variation?.stock ?? null,
    })),
  };

  return <KitForm kitId={kit.id} initial={initial} />;
}
