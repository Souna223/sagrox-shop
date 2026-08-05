import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { parseCsv, decodeCsvBuffer, normalizeHeader, toInt, toNumber } from "@/lib/csv";
import { recomputeProductRating } from "@/lib/reviews";
import type { ReviewStatus } from "@/generated/prisma/enums";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 1000;

type ImportError = { row: number; name: string; error: string };

function reviewStatusFrom(raw: string): ReviewStatus {
  const v = raw.trim().toUpperCase();
  if (v === "REJECTED" || v === "REJEITADA" || v === "REJEITADO") return "REJECTED";
  if (v === "PENDING" || v === "PENDENTE") return "PENDING";
  return "APPROVED";
}

function syntheticEmail(name: string, rowNumber: number): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "cliente";
  return `${base}${rowNumber}@import.local`;
}

function parseRating(raw: string): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const filledStars = s.match(/★/g);
  if (filledStars && filledStars.length > 0) {
    return Math.min(5, filledStars.length);
  }

  const fraction = s.match(/(\d+(?:[.,]\d+)?)\s*[/de:]\s*(\d+(?:[.,]\d+)?)/i);
  if (fraction) {
    const a = Number(fraction[1].replace(",", "."));
    const b = Number(fraction[2].replace(",", "."));
    if (b > 0) return Math.round((a / b) * 5);
    return null;
  }

  const n = toNumber(s);
  if (n === null) return null;
  return Math.round(n);
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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
      return fail(`O CSV pode conter no máximo ${MAX_ROWS} avaliações.`, 422);
    }

    const resolveColumn = (keywords: string[]): string => {
      const normHeaders = headers.map(normalizeHeader);
      const normKeywords = keywords.map(normalizeHeader);
      for (let i = 0; i < headers.length; i++) {
        if (normKeywords.includes(normHeaders[i])) return headers[i];
      }
      let best = "";
      let bestScore = Infinity;
      for (let i = 0; i < headers.length; i++) {
        const h = normHeaders[i];
        if (!h) continue;
        for (const kw of normKeywords) {
          if (h.includes(kw) || kw.includes(h)) {
            if (h.length < bestScore) {
              bestScore = h.length;
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

    const SKU_COL = resolveColumn(["sku", "productsku", "codigo"]);
    const SLUG_COL = resolveColumn(["slug"]);
    const PRODUCT_NAME_COL = resolveColumn(["product", "produto", "productname", "nomeproduto"]);
    const EMAIL_COL = resolveColumn(["email", "customeremail", "cliente", "user", "customer"]);
    const CUSTOMER_NAME_COL = resolveColumn(["name", "nome", "customername", "clientenome"]);
    const RATING_COL = resolveColumn(["rating", "nota", "estrelas", "stars", "avaliacao", "score", "star", "estrela"]);
    const TITLE_COL = resolveColumn(["title", "titulo", "assunto", "subject"]);
    const COMMENT_COL = resolveColumn(["comment", "comentario", "review", "texto", "mensagem", "description"]);
    const STATUS_COL = resolveColumn(["status", "situacao"]);
    const DATE_COL = resolveColumn(["date", "data", "createdat", "criadoem"]);

    if (!RATING_COL) {
      return fail(
        "Nenhuma coluna de nota encontrada (esperado: rating, nota, estrelas ou stars). Verifique se a primeira linha contém os cabeçalhos do CSV.",
        422,
      );
    }

    const overrideProduct = typeof form.get("product") === "string" ? (form.get("product") as string).trim() : "";
    let overrideProductId: string | null = null;
    let overrideProductLabel: string | null = null;
    if (overrideProduct) {
      const bySku = await prisma.product.findFirst({
        where: { sku: overrideProduct },
        select: { id: true, name: true },
      });
      const bySlug = bySku
        ? null
        : await prisma.product.findFirst({ where: { slug: overrideProduct }, select: { id: true, name: true } });
      const byName = bySlug
        ? null
        : await prisma.product.findFirst({
            where: { name: { equals: overrideProduct, mode: "insensitive" } },
            select: { id: true, name: true },
          });
      const match = bySku ?? bySlug ?? byName;
      if (match) {
        overrideProductId = match.id;
        overrideProductLabel = match.name;
      }
    }

    const skuSet = new Set<string>();
    const slugSet = new Set<string>();
    const nameSet = new Set<string>();
    const emailSet = new Set<string>();

    for (const row of rows) {
      const sku = column(row, SKU_COL);
      const slug = column(row, SLUG_COL);
      const name = column(row, PRODUCT_NAME_COL);
      const email = column(row, EMAIL_COL);
      if (sku) skuSet.add(sku);
      if (slug) slugSet.add(slug);
      if (name) nameSet.add(name.toLowerCase());
      if (email) emailSet.add(email.toLowerCase());
    }

    const [productsBySku, productsBySlug, productsByName, usersByEmail] = await Promise.all([
      skuSet.size
        ? prisma.product.findMany({ where: { sku: { in: [...skuSet] } }, select: { id: true, sku: true } })
        : [],
      slugSet.size
        ? prisma.product.findMany({ where: { slug: { in: [...slugSet] } }, select: { id: true, slug: true } })
        : [],
      nameSet.size
        ? prisma.product.findMany({
            where: { name: { in: [...nameSet], mode: "insensitive" } },
            select: { id: true, name: true },
          })
        : [],
      emailSet.size
        ? prisma.user.findMany({
            where: { email: { in: [...emailSet] } },
            select: { id: true, email: true },
          })
        : [],
    ]);

    const productIdBySku = new Map(productsBySku.map((p) => [p.sku.toLowerCase(), p.id]));
    const productIdBySlug = new Map(productsBySlug.map((p) => [p.slug.toLowerCase(), p.id]));
    const productIdByName = new Map(productsByName.map((p) => [p.name.toLowerCase(), p.id]));
    const userIdByEmail = new Map(usersByEmail.map((u) => [u.email.toLowerCase(), u.id]));

    const created: { id: string; product: string; email: string }[] = [];
    const errors: ImportError[] = [];
    const touchedProducts = new Set<string>();
    const usersCreated = new Set<string>();

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rowNumber = r + 2;

      const sku = column(row, SKU_COL);
      const slug = column(row, SLUG_COL);
      const productName = column(row, PRODUCT_NAME_COL);
      const rawEmail = column(row, EMAIL_COL);
      const email = rawEmail ? rawEmail.toLowerCase() : syntheticEmail(column(row, CUSTOMER_NAME_COL), rowNumber);
      const customerName = column(row, CUSTOMER_NAME_COL) || email.split("@")[0] || "Cliente";
      const rawRating = column(row, RATING_COL);
      const rating = parseRating(rawRating);
      const rawTitle = column(row, TITLE_COL);
      const title = rawTitle && parseRating(rawTitle) !== null ? null : rawTitle;
      const comment = column(row, COMMENT_COL);
      const status = STATUS_COL ? reviewStatusFrom(column(row, STATUS_COL)) : "APPROVED";
      const createdAt = DATE_COL ? parseDate(column(row, DATE_COL)) : null;

      const productId =
        (sku && productIdBySku.get(sku.toLowerCase())) ||
        (slug && productIdBySlug.get(slug.toLowerCase())) ||
        (productName && productIdByName.get(productName.toLowerCase())) ||
        overrideProductId;

      if (!productId) {
        errors.push({
          row: rowNumber,
          name: productName || sku,
          error: overrideProduct
            ? "Produto informado não encontrado (verifique o SKU, slug ou nome no campo 'Produto')."
            : "Produto não encontrado (verifique SKU, slug ou nome).",
        });
        continue;
      }

      if (rating === null || rating < 1 || rating > 5) {
        errors.push({
          row: rowNumber,
          name: productName || sku,
          error: `A nota "${rawRating}" (coluna "${RATING_COL}") deve ser um número entre 1 e 5.`,
        });
        continue;
      }

      let userId = userIdByEmail.get(email);
      if (!userId) {
        try {
          const createdUser = await prisma.user.create({
            data: { name: customerName.trim() || "Cliente", email },
            select: { id: true },
          });
          userId = createdUser.id;
          userIdByEmail.set(email, userId);
          usersCreated.add(email);
        } catch {
          errors.push({ row: rowNumber, name: productName || sku, error: `Não foi possível criar o cliente "${email}".` });
          continue;
        }
      }

      const duplicate = await prisma.review.findFirst({
        where: { productId, userId },
        select: { id: true },
      });

      if (duplicate) {
        errors.push({ row: rowNumber, name: productName || sku, error: `Cliente "${email}" já avaliou este produto.` });
        continue;
      }

      try {
        const review = await prisma.review.create({
          data: {
            productId,
            userId,
            rating,
            title: title || null,
            comment: comment || null,
            status,
            createdAt: createdAt ?? undefined,
          },
          select: { id: true },
        });
        created.push({ id: review.id, product: overrideProductLabel || productName || sku, email });
        touchedProducts.add(productId);
      } catch (error) {
        errors.push({
          row: rowNumber,
          name: productName || sku,
          error: error instanceof Error ? error.message : "Não foi possível criar a avaliação.",
        });
      }
    }

    for (const productId of touchedProducts) {
      await recomputeProductRating(productId).catch(() => {});
    }

    return ok({
      total: rows.length,
      created: created.length,
      errors: errors.length,
      usersCreated: usersCreated.size,
      issues: errors,
    });
  } catch (error) {
    return handleError(error, "Não foi possível importar o CSV de avaliações.");
  }
}
