import { NextRequest } from "next/server";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { importProductFromUrl } from "@/lib/product-import";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();
    if (!url) return fail("Informe a URL do produto.", 422);

    const data = await importProductFromUrl(url);
    return ok(data);
  } catch (error) {
    return handleError(error, "Não foi possível importar o produto.");
  }
}
