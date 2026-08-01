import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { SettingsForm } from "@/components/admin/settings-form";
import { AppmaxIntegration } from "@/components/admin/appmax-integration";
import type { SettingValues } from "@/lib/admin-settings";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const rows = await prisma.setting.findMany();
  const initial: SettingValues = Object.fromEntries(rows.map((r) => [r.key, r.value as never]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajustes gerais da loja.</p>
      </div>
      <AppmaxIntegration />
      <SettingsForm initial={initial} />
    </div>
  );
}
