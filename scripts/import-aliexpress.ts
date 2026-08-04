import "dotenv/config";
import { readFileSync } from "node:fs";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const ENTITIES: Record<string, string> = {
  "&ccedil;": "ç", "&Ccedil;": "Ç", "&atilde;": "ã", "&Atilde;": "Ã", "&otilde;": "õ",
  "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú",
  "&auml;": "ä", "&euml;": "ë", "&iuml;": "ï", "&ouml;": "ö", "&uuml;": "ü",
  "&agrave;": "à", "&egrave;": "è", "&igrave;": "ì", "&ograve;": "ò", "&ugrave;": "ù",
  "&acirc;": "â", "&ecirc;": "ê", "&icirc;": "î", "&ocirc;": "ô", "&ucirc;": "û",
  "&Acirc;": "Â", "&Ecirc;": "Ê", "&Icirc;": "Î", "&Ocirc;": "Ô", "&Ucirc;": "Û",
  "&Agrave;": "À", "&Egrave;": "È", "&Igrave;": "Ì", "&Ograve;": "Ò", "&Ugrave;": "Ù",
  "&Aacute;": "Á", "&Eacute;": "É", "&Iacute;": "Í", "&Oacute;": "Ó", "&Uacute;": "Ú",
  "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  "&rsquo;": "'", "&lsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&mdash;": "—", "&ndash;": "–",
};

function decodeEntities(s: string): string {
  return s.replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => {
    if (m.startsWith("&#")) {
      return String.fromCharCode(Number(m.slice(2, -1)));
    }
    return ENTITIES[m] ?? m;
  });
}

function stripHtml(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, "\n");
  s = s.replace(/<\/[a-z]+>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function slugify(s: string): string {
  const map: Record<string, string> = {
    à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a",
    è: "e", é: "e", ê: "e", ë: "e",
    ì: "i", í: "i", î: "i", ï: "i",
    ò: "o", ó: "o", ô: "o", õ: "o", ö: "o",
    ù: "u", ú: "u", û: "u", ü: "u",
    ñ: "n", ç: "c", ß: "ss", ' ': "-",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePrice(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/[^0-9.,]/g, "");  if (!clean) return null;
  let value: number;
  if (clean.includes(",") && clean.includes(".")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    if (lastComma > lastDot) {
      value = parseFloat(clean.replace(/\./g, "").replace(",", "."));
    } else {
      value = parseFloat(clean.replace(/,/g, ""));
    }
  } else if (clean.includes(",")) {
    value = parseFloat(clean.replace(/,/g, "."));
  } else {
    value = parseFloat(clean);
  }
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function parseStock(s: string): number {
  const m = (s ?? "").match(/\d+/);
  if (!m) return 0;
  return parseInt(m[0], 10);
}

function parseWeightKg(text: string): number | null {
  const m = text.match(/peso[^0-9]{0,20}([0-9]+[,.]?[0-9]*)\s*(kg|g|gramas?)/i);
  if (!m) return null;
  const raw = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(raw)) return null;
  return m[2].toLowerCase() === "kg" ? raw : raw / 1000;
}

function splitImages(main: string, all: string): string[] {
  const urls = [main, ...(all ? all.split(/\s*\|\|\s*/) : [])]
    .map((u) => u.trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

const COLUMN_ALIASES: Record<string, string> = {
  id: "id",
  "product title": "title",
  title: "title",
  "product url": "url",
  "original price": "originalPrice",
  "sale price": "salePrice",
  price: "salePrice",
  stock: "stock",
  "main image": "mainImage",
  "all images": "allImages",
  image: "mainImage",
  description: "description",
  "shipping info": "shippingInfo",
  "shipping from": "shippingFrom",
  "sku properties": "skuProperties",
  specifications: "specifications",
  "category path": "categoryPath",
  brand: "brand",
  "product rating": "rating",
  "total reviews": "reviews",
  "store name": "storeName",
  "seller country": "sellerCountry",
  "max delivery time": "maxDeliveryTime",
  "min delivery time": "minDeliveryTime",
};

function mapHeader(header: string): string | null {
  const key = header.trim().toLowerCase();
  return COLUMN_ALIASES[key] ?? null;
}

async function main() {
  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    console.error("Uso: tsx scripts/import-aliexpress.ts <arquivo.csv> [arquivo2.csv ...]");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of filePaths) {
    const text = readFileSync(filePath, "utf8");
    const rows = parseCsv(text);
    if (rows.length < 2) {
      console.warn(`[${filePath}] Sem dados.`);
      continue;
    }

    const header = rows[0].map((h) => h.trim());
    const col = new Map<string, number>();
    for (let i = 0; i < header.length; i++) {
      const mapped = mapHeader(header[i]);
      if (mapped && !col.has(mapped)) col.set(mapped, i);
    }

    const need = ["title", "salePrice", "mainImage", "description"];
    const missing = need.filter((n) => !col.has(n));
    if (missing.length > 0) {
      console.error(`[${filePath}] Colunas obrigatórias faltando: ${missing.join(", ")}`);
      console.error(`Header: ${header.join(" | ")}`);
      continue;
    }

    for (const row of rows.slice(1)) {
      const get = (key: string): string => {
        const idx = col.get(key);
        return idx === undefined ? "" : (row[idx] ?? "").trim();
      };

      const id = get("id");
      const sku = id || get("title").slice(0, 32);
      const title = get("title");

      if (!title) {
        console.warn("Linha ignorada (sem título).");
        continue;
      }

      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        console.log(`[skip] SKU já existe: ${sku} (${existing.name})`);
        skipped++;
        continue;
      }

      const salePrice = parsePrice(get("salePrice"));
      const originalPrice = parsePrice(get("originalPrice"));
      if (salePrice === null) {
        console.error(`[erro] Preço inválido para "${title}" (Sale Price: ${get("salePrice")})`);
        failed++;
        continue;
      }
      const compareAt = originalPrice !== null && originalPrice > salePrice ? originalPrice : null;

      const descriptionText = stripHtml(get("description"));
      const shortDescription = descriptionText.replace(/\n+/g, " ").slice(0, 160).trim() || null;
      const weightKg = parseWeightKg(descriptionText);
      const images = splitImages(get("mainImage"), get("allImages"));

      const baseSlug = slugify(title) || `produto-${sku}`;
      let slug = baseSlug;
      let n = 1;
      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${n++}`;
      }

      let brandId: string | null = null;
      const brandName = get("brand");
      if (brandName && !/^not\s*available$/i.test(brandName)) {
        const brandSlug = slugify(brandName) || `marca-${sku}`;
        const brand = await prisma.brand.upsert({
          where: { slug: brandSlug },
          update: {},
          create: { name: brandName, slug: brandSlug, active: true },
        });
        brandId = brand.id;
      }

      const attributes: Prisma.InputJsonObject = {
        source: "aliexpress",
        productUrl: get("url") || undefined,
        specifications: get("specifications") || undefined,
        shippingInfo: get("shippingInfo") || undefined,
        shippingFrom: get("shippingFrom") || undefined,
        skuProperties: get("skuProperties") || undefined,
        categoryPath: get("categoryPath") || undefined,
        storeName: get("storeName") || undefined,
        sellerCountry: get("sellerCountry") || undefined,
        maxDeliveryTime: get("maxDeliveryTime") || undefined,
        minDeliveryTime: get("minDeliveryTime") || undefined,
      };

      const product = await prisma.product.create({
        data: {
          name: title,
          slug,
          sku,
          shortDescription,
          description: descriptionText,
          brandId,
          categoryId: null,
          price: salePrice,
          compareAtPrice: compareAt,
          stock: parseStock(get("stock")),
          status: "ACTIVE",
          visibility: "VISIBLE",
          isNew: true,
          weight: weightKg,
          attributes,
          tags: ["aliexpress"],
          images: {
            create: images.map((url, i) => ({
              url,
              alt: i === 0 ? title : null,
              sortOrder: i,
              isMain: i === 0,
            })),
          },
        },
      });

      console.log(`[ok] ${product.name} — SKU ${sku} — R$ ${salePrice.toFixed(2)} — ${images.length} imagens`);
      created++;
    }
  }

  console.log(`\nResumo: ${created} criados, ${skipped} ignorados, ${failed} com erro.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
