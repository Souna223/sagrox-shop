import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { serializeAnnouncement, serializeFaq } from "@/lib/admin-content";
import { ContentTabs } from "@/components/admin/content-tabs";

export const metadata: Metadata = {
  title: "Marketing e conteúdo",
};

type PageProps = {
  searchParams: Promise<{ q?: string; active?: string; page?: string }>;
};

export default async function AdminContentPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { q = "", active = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where: Record<string, unknown> = {};
  if (q.trim()) where.message = { contains: q, mode: "insensitive" };
  if (active === "ACTIVE") where.active = true;
  if (active === "INACTIVE") where.active = false;

  const [announcements, announcementTotal, faqs] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.announcement.count({ where }),
    prisma.fAQ.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing e conteúdo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie anúncios da loja e perguntas frequentes.
        </p>
      </div>
      <ContentTabs
        announcements={{
          items: announcements.map((a) => serializeAnnouncement(a as never)),
          total: announcementTotal,
          page,
          totalPages: Math.ceil(announcementTotal / perPage),
        }}
        faqs={{ items: faqs.map((f) => serializeFaq(f as never)), total: faqs.length }}
        announcementsQ={q}
        announcementsActive={active}
      />
    </div>
  );
}
