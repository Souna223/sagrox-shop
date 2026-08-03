import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_FOLDER = "sagrox/products";

if (CLOUD && (CLOUD.startsWith('"') || CLOUD.includes(" "))) {
  console.warn("CLOUDINARY_CLOUD_NAME contém aspas ou espaços — remova as aspas no .env.");
}

function sign(params: Record<string, string | number>) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`);
  return createHash("sha1").update(sorted.join("&") + API_SECRET).digest("hex");
}

function cloudinaryConfigured() {
  return Boolean(CLOUD && API_KEY && API_SECRET);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    if (!cloudinaryConfigured()) {
      return fail("Cloudinary não configurado. Preencha CLOUDINARY_* no arquivo .env.", 503);
    }

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

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ timestamp, folder: UPLOAD_FOLDER, resource_type: "image" });

    const body = new FormData();
    body.append("file", file, file.name);
    body.append("api_key", API_KEY!);
    body.append("timestamp", String(timestamp));
    body.append("folder", UPLOAD_FOLDER);
    body.append("resource_type", "image");
    body.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { secure_url?: string; error?: { message?: string } };

    if (!res.ok || !data.secure_url) {
      console.error("Cloudinary upload error:", data);
      const detail =
        data.error?.message ?? (typeof data.error === "string" ? data.error : res.statusText);
      return fail(detail ? `Falha no Cloudinary: ${detail}` : "Não foi possível enviar a imagem para o Cloudinary.", 502);
    }

    return ok({ url: data.secure_url });
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

    const prefix = `https://res.cloudinary.com/${CLOUD}/image/upload/`;
    if (!url.startsWith(prefix)) return ok({ deleted: false });

    const publicId = url.slice(prefix.length).replace(/^v\d+\//, "");
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ timestamp, public_id: publicId });

    const params = new URLSearchParams({
      public_id: publicId,
      api_key: API_KEY!,
      timestamp: String(timestamp),
      signature,
    });

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, {
      method: "POST",
      body: params,
    });
    await res.json();

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "Não foi possível remover a imagem.");
  }
}
