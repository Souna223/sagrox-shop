import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveKitBySlug, incrementKitView } from "@/lib/kits";
import { KitDetail } from "@/components/storefront/kit-detail";
import { getDictionary } from "@/lib/i18n/server";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const t = await getDictionary();
  const kit = await prisma.kit.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { name: true, description: true, seoTitle: true, seoDescription: true },
  });
  if (!kit) return { title: t.kits.notFound };
  return {
    title: kit.seoTitle ?? kit.name,
    description: kit.seoDescription ?? kit.description ?? undefined,
  };
}

export default async function KitPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getDictionary();
  const kit = await getActiveKitBySlug(slug);

  if (!kit) notFound();
  incrementKitView(kit.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>{t.account.home}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/kits" />}>{t.header.kits}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{kit.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <KitDetail kit={kit} />
    </div>
  );
}
