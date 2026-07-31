import { prisma } from "@/lib/prisma";

type AuditParams = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function auditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: (params.details ?? null) as never,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
    .catch((err) => {
      console.error("[audit] Falha ao registrar log:", err);
    });
}
