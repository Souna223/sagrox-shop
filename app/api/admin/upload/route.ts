import { NextRequest } from "next/server";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      return fail("Envie um arquivo de imagem.", 422);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return fail("Formato de imagem não suportado (use JPG, PNG, WebP, GIF ou AVIF).", 422);
    }
    if (file.size > MAX_SIZE) {
      return fail("A imagem deve ter no máximo 8MB.", 422);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_TYPE[file.type] ?? "jpg";
    const name = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);

    return ok({ url: `/uploads/products/${name}` });
  } catch (error) {
    return handleError(error, "Não foi possível enviar a imagem.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as { url?: string };
    const url = body.url;
    if (!url || typeof url !== "string") return fail("Informe a URL da imagem.", 422);

    const uploadsRoot = path.resolve(process.cwd(), "public");
    const filePath = path.resolve(process.cwd(), "public", ...url.split("/").filter(Boolean));
    if (!filePath.startsWith(uploadsRoot + path.sep)) {
      return fail("Caminho de imagem inválido.", 422);
    }

    await rm(filePath, { force: true });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "Não foi possível remover a imagem.");
  }
}
