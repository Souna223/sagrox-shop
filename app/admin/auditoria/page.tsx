import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { AuditTable } from "@/components/admin/audit-table";

export const metadata: Metadata = {
  title: "Auditoria",
};

type PageProps = {
  searchParams: Promise<{ entityType?: string; action?: string; q?: string; page?: string }>;
};

const ENTITY_TYPES = ["product", "order", "user", "coupon", "review", "announcement", "faq", "setting"];

export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { entityType = "ALL", action = "", q = "", page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam ?? 1));
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (ENTITY_TYPES.includes(entityType)) where.entityType = entityType;
  if (action.trim()) where.action = { contains: action.trim().toUpperCase(), mode: "insensitive" };
  if (q.trim()) {
    where.OR = [
      { entityId: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const serialized = items.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
    user: log.user,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} registro{total === 1 ? "" : "s"} de atividade administrativa.
        </p>
      </div>
      <AuditTable
        initial={{ items: serialized, total, page, totalPages: Math.ceil(total / perPage) }}
        entityType={entityType}
        action={action}
        q={q}
      />
    </div>
  );
}
