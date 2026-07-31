import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { settingsSchema, SETTING_KEYS, type SettingValues } from "@/lib/admin-settings";
import { auditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.setting.findMany();
    const settings: SettingValues = Object.fromEntries(rows.map((r) => [r.key, r.value as never]));
    return ok(settings);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = settingsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const entries = Object.entries(parsed.data as never) as [string, unknown][];
    if (entries.length === 0) return fail("Nenhuma configuração informada.", 422);

    for (const [key, value] of entries) {
      if (!SETTING_KEYS.includes(key as never)) continue;
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as never },
        create: { key, value: value as never },
      });
    }

    await auditLog({
      userId: admin.id,
      action: "CONFIG.ATUALIZADA",
      entityType: "setting",
      details: { keys: entries.map(([k]) => k) },
    });

    const rows = await prisma.setting.findMany();
    const settings: SettingValues = Object.fromEntries(rows.map((r) => [r.key, r.value as never]));
    return ok(settings);
  } catch (error) {
    return handleError(error);
  }
}
