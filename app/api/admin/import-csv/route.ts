import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { parseCsv, decodeCsvBuffer, normalizeHeader, splitList, toNumber, toInt } from "@/lib/csv";
import { productSchema } from "@/lib/validators";
import { applyProductPayload } from "@/lib/admin-products";
import type { ProductStatus, ProductVisibility } from "@/generated/prisma/enums";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 500;

type ImportError = { row: number; name: string; error: string };

function statusFrom(raw: string): ProductStatus {
  const v = raw.trim().toUpperCase();
  if (v === "ACTIVE" || v === "ATIVO" || v === "SIM" || v === "PUBLICADO") return "ACTIVE";
  if (v === "INACTIVE" || v === "INATIVO" || v === "NAO" || v === "NÃO") return "INACTIVE";
  return "DRAFT";
}

function visibilityFrom(raw: string): ProductVisibility {
  const v = raw.trim().toUpperCase();
  if (v === "HIDDEN" || v === "OCULTO") return "HIDDEN";
  return "VISIBLE";
}

function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      return fail("Envie um arquivo CSV.", 422);
    }
    if (file.size > MAX_FILE_SIZE) {
      return fail("O arquivo deve ter no máximo 2MB.", 413);
    }

    let headers: string[];
    let rows: string[][];
    try {
      const parsed = parseCsv(decodeCsvBuffer(Buffer.from(await file.arrayBuffer())));
      headers = parsed.headers;
      rows = parsed.rows;
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Não foi possível ler o CSV.", 422);
    }

    if (rows.length > MAX_ROWS) {
      return fail(`O CSV pode conter no máximo ${MAX_ROWS} produtos.`, 422);
    }

    const col = new Map<string, number>();
    headers.forEach((h, i) => col.set(normalizeHeader(h), i));

    const field = (row: string[], names: string[]) => {
      for (const n of names) {
        const idx = col.get(normalizeHeader(n));
        if (idx !== undefined && idx < row.length) {
          const value = row[idx].trim();
          if (value) return value;
        }
      }
      return "";
    };

    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);
    const brandIdByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));
    const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const created: { id: string; name: string; sku: string }[] = [];
    const errors: ImportError[] = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rowNumber = r + 2;

      const name = field(row, ["name", "nome", "produto", "titulo", "title"]);
      const sku = field(row, ["sku"]);
      const priceRaw = field(row, ["price", "preco", "preco", "valor", "precovenda"]);
      const compareRaw = field(row, ["compareatprice", "precode", "precode", "compararpreco"]);
      const stockRaw = field(row, ["stock", "estoque", "quantidade", "qty"]);
      const description = field(row, ["description", "descricao", "descricao"]);
      const shortDescription = field(row, ["shortdescription", "descricaocurta", "resumo"]);
      const imagesRaw = field(row, ["images", "image", "imagens", "fotos", "foto", "gallery"]);
      const tagsRaw = field(row, ["tags", "etiquetas", "palavraschave"]);
      const brandName = field(row, ["brand", "marca"]);
      const categoryName = field(row, ["category", "categoria"]);
      const statusRaw = field(row, ["status", "situacao"]);
      const visibilityRaw = field(row, ["visibility", "visibilidade"]);

      if (!name) {
        errors.push({ row: rowNumber, name: "", error: "Informe o nome do produto." });
        continue;
      }

      const price = toNumber(priceRaw);
      if (price === null) {
        errors.push({ row: rowNumber, name, error: "Informe um preço válido (ex.: 49.90 ou 49,90)." });
        continue;
      }

      const finalSku = sku || `IMP-${Date.now().toString(36).toUpperCase()}${rowNumber}`;

      const existing = await prisma.product.findUnique({ where: { sku: finalSku } });
      if (existing) {
        errors.push({ row: rowNumber, name, error: `SKU "${finalSku}" já existe.` });
        continue;
      }

      const images = splitList(imagesRaw).filter(isValidUrl).slice(0, 8);

      const payload = {
        name,
        sku: finalSku,
        price,
        compareAtPrice: toNumber(compareRaw),
        stock: toInt(stockRaw) ?? 0,
        lowStockThreshold: 5,
        status: statusFrom(statusRaw),
        visibility: visibilityFrom(visibilityRaw),
        description,
        shortDescription,
        images,
        tags: splitList(tagsRaw),
        brandId: brandName ? brandIdByName.get(brandName.toLowerCase()) ?? null : null,
        categoryId: categoryName ? categoryIdByName.get(categoryName.toLowerCase()) ?? null : null,
        isFeatured: false,
        isBestSeller: false,
        isNew: false,
        freeShipping: false,
        variations: [],
      };

      const parsedPayload = productSchema.safeParse(payload);
      if (!parsedPayload.success) {
        errors.push({
          row: rowNumber,
          name,
          error: parsedPayload.error.issues[0]?.message ?? "Dados inválidos.",
        });
        continue;
      }

      try {
        const product = await applyProductPayload(parsedPayload.data);
        created.push({ id: product.id, name: product.name, sku: product.sku });
      } catch (error) {
        errors.push({
          row: rowNumber,
          name,
          error: error instanceof Error ? error.message : "Não foi possível criar o produto.",
        });
      }
    }

    return ok({
      total: rows.length,
      created: created.length,
      errors: errors.length,
      products: created,
      issues: errors,
    });
  } catch (error) {
    return handleError(error, "Não foi possível importar o CSV.");
  }
}
