import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { parseCsv, decodeCsvBuffer, normalizeHeader, splitList, toNumber, toInt, htmlToText, extractHtmlImages } from "@/lib/csv";
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

    const resolveColumn = (keywords: string[], exclude: string[], prefer = ""): string => {
      const normHeaders = headers.map(normalizeHeader);
      const normKeywords = keywords.map(normalizeHeader);
      const normExclude = exclude.map(normalizeHeader);
      for (let i = 0; i < headers.length; i++) {
        if (normKeywords.includes(normHeaders[i])) return headers[i];
      }
      let best = "";
      let bestScore = Infinity;
      for (let i = 0; i < headers.length; i++) {
        const h = normHeaders[i];
        if (!h) continue;
        if (normExclude.some((e) => h.includes(e))) continue;
        for (const kw of normKeywords) {
          if (h.includes(kw) || kw.includes(h)) {
            const score = h.length - (prefer && h.includes(prefer) ? 100 : 0);
            if (score < bestScore) {
              bestScore = score;
              best = headers[i];
            }
            break;
          }
        }
      }
      return best;
    };

    const column = (row: string[], colName: string, fallback = "") => {
      const idx = headers.indexOf(colName);
      if (idx !== -1 && idx < row.length) {
        const value = row[idx].trim();
        if (value) return value;
      }
      return fallback;
    };

    const NAME_COL = resolveColumn(["name", "nome", "produto", "titulo", "title"], ["sku", "store", "loja"], "title");
    if (!NAME_COL) {
      return fail(
        "Nenhuma coluna de nome encontrada (esperado: name, nome ou produto). Verifique se a primeira linha contém os cabeçalhos do CSV.",
        422,
      );
    }

    const SKU_COL =
      resolveColumn(["sku", "codigo", "barcode"], ["properties", "propriedades", "variacao", "variation", "total", "available", "disponivel"]) ||
      resolveColumn(["id"], ["category", "store"]);
    const PRICE_COL = resolveColumn(["price", "preco", "valor", "precovenda", "saleprice", "precovendaatual"], ["compare", "original", "oferta", "de"]);
    const COMPARE_COL = resolveColumn(["compareatprice", "precode", "compararpreco", "precooriginal", "originalprice", "pricedepromo"], []);
    const STOCK_COL = resolveColumn(["stock", "estoque", "quantidade", "qty", "inventory"], []);
    const DESC_COL = resolveColumn(["description", "descricao"], ["curta", "short", "resumo"]);
    const SHORT_DESC_COL = resolveColumn(["shortdescription", "descricaocurta", "resumo", "resume"], []);
    const IMAGES_COL = resolveColumn(["images", "image", "imagens", "fotos", "foto", "gallery"], [], "all");
    const TAGS_COL = resolveColumn(["tags", "etiquetas", "palavraschave"], []);
    const BRAND_COL = resolveColumn(["brand", "marca"], []);
    const CATEGORY_COL = resolveColumn(["category", "categoria"], ["id", "path"]);
    const STATUS_COL = resolveColumn(["status", "situacao"], []);
    const VISIBILITY_COL = resolveColumn(["visibility", "visibilidade"], []);

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

      const name = column(row, NAME_COL);
      const sku = column(row, SKU_COL);
      const priceRaw = column(row, PRICE_COL);
      const compareRaw = column(row, COMPARE_COL);
      const stockRaw = column(row, STOCK_COL);
      const descriptionRaw = column(row, DESC_COL);
      const description = htmlToText(descriptionRaw);
      const shortDescription =
        column(row, SHORT_DESC_COL) ||
        (description ? description.replace(/\s+/g, " ").slice(0, 160) : "");
      const imagesRaw = column(row, IMAGES_COL);
      const tagsRaw = column(row, TAGS_COL);
      const brandName = column(row, BRAND_COL);
      const categoryName = column(row, CATEGORY_COL);
      const statusRaw = column(row, STATUS_COL);
      const visibilityRaw = column(row, VISIBILITY_COL);

      if (!name) {
        errors.push({
          row: rowNumber,
          name: "",
          error: `Não foi possível ler a coluna de nome (cabeçalho "${NAME_COL}").`,
        });
        continue;
      }

      if (!PRICE_COL) {
        errors.push({
          row: rowNumber,
          name,
          error: "Nenhuma coluna de preço encontrada (esperado: price, preco ou valor).",
        });
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

      const images = [
        ...splitList(imagesRaw),
        ...extractHtmlImages(descriptionRaw).filter(isValidUrl),
      ]
        .filter(isValidUrl)
        .filter((url, i, arr) => arr.indexOf(url) === i)
        .slice(0, 8);

      const payload = {
        name,
        sku: finalSku,
        price,
        compareAtPrice: toNumber(compareRaw),
        stock: toInt(stockRaw) ?? 0,
        lowStockThreshold: 5,
        status: STATUS_COL ? statusFrom(statusRaw) : "ACTIVE",
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
