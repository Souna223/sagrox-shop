import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReviewsTable } from "@/components/admin/reviews-table";
import ReviewImportForm from "@/components/admin/review-import-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Avaliações",
};

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { q = "", status = "ALL", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 15;

  const where: Record<string, unknown> = {};
  if (STATUSES.includes(status)) where.status = status;
  if (q.trim()) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { comment: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total, pending] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ product: { name: "asc" } }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  const serialized = items.map((review) => ({
    ...review,
    createdAt: review.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} avaliação{total === 1 ? "" : "ões"} registrada{total === 1 ? "" : "s"}.
        </p>
      </div>
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Avaliações</TabsTrigger>
          <TabsTrigger value="import">Importar CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="pt-4">
          <ReviewsTable
            initial={{ items: serialized, total, pending, page, totalPages: Math.ceil(total / perPage) }}
            q={q}
            status={status}
          />
        </TabsContent>
        <TabsContent value="import" className="pt-4">
          <ReviewImportForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
