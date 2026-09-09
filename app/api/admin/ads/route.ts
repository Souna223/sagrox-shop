import { NextRequest } from "next/server";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { getAdsSettings, saveAdsSettings } from "@/lib/ads";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getAdsSettings());
  } catch (error) {
    return handleError(error);
  }
}

const ALLOWED_KEYS = new Set([
  "metaPixelId",
  "metaAccessToken",
  "metaTestEventCode",
  "tiktokPixelId",
  "tiktokAccessToken",
  "tiktokTestEventCode",
]);

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body || typeof body !== "object") return fail("Dados inválidos.", 422);

    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      patch[key] = typeof value === "string" ? value : String(value ?? "");
    }
    if (Object.keys(patch).length === 0) return fail("Nenhuma configuração informada.", 422);

    return ok(await saveAdsSettings(patch));
  } catch (error) {
    return handleError(error);
  }
}