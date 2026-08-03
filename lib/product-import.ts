export type ImportedProductData = {
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  description: string;
  source: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#\d+;/g, "");
}

function metaContent(html: string, key: string): string | null {
  const re = /<meta([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1];
    const attr = tag.match(/(?:property|name)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (attr.toLowerCase() !== key.toLowerCase()) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) return decodeEntities(content).trim();
  }
  return null;
}

function metaContentAll(html: string, key: string): string[] {
  const out: string[] = [];
  const re = /<meta([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1];
    const attr = tag.match(/(?:property|name)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (attr.toLowerCase() !== key.toLowerCase()) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) out.push(decodeEntities(content).trim());
  }
  return out;
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      if (Array.isArray(parsed)) out.push(...(parsed as Record<string, unknown>[]));
      else if (parsed && typeof parsed === "object") out.push(parsed as Record<string, unknown>);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return out;
}

function findProductJsonLd(blocks: Record<string, unknown>[]): Record<string, unknown> | null {
  for (const block of blocks) {
    const type = block["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Product")) return block;
  }
  for (const block of blocks) {
    if ("price" in block && "name" in block) return block;
  }
  return null;
}

function priceFromOffer(value: unknown): number | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const offer of value) {
      const p = priceFromOffer(offer);
      if (p !== null) return p;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if ("price" in obj) return parsePrice(String(obj["price"]));
  if ("lowPrice" in obj) return parsePrice(String(obj["lowPrice"]));
  return null;
}

function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function importProductFromUrl(rawUrl: string): Promise<ImportedProductData> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Informe uma URL válida (https://...).");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Informe uma URL válida (https://...).");
  }

  const response = await fetch(url.href, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível acessar o link (HTTP ${response.status}).`);
  }
  const html = await response.text();
  const base = url.href;

  const jsonLdBlocks = extractJsonLd(html);
  const product = findProductJsonLd(jsonLdBlocks);

  let name =
    metaContent(html, "og:title") ??
    product?.name?.toString() ??
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ??
    "";

  name = decodeEntities(name)
    .replace(/\s*\|\s*[^|]*$/, "")
    .trim();

  let price: number | null = null;
  let compareAtPrice: number | null = null;

  const ogPrice = metaContent(html, "product:price:amount") ?? metaContent(html, "og:price:amount");
  price = parsePrice(ogPrice);

  const originalPrice = metaContent(html, "product:original_price:amount");
  if (originalPrice) {
    const parsed = parsePrice(originalPrice);
    if (parsed !== null && price !== null && parsed > price) compareAtPrice = parsed;
  }

  if (product) {
    const offers = product["offers"];
    if (price === null) price = priceFromOffer(offers);
    if (price === null) price = parsePrice(String(product["price"] ?? ""));
  }

  const jsonLdPrice = parsePrice(String(product?.["price"] ?? ""));
  if (price === null) price = jsonLdPrice;

  if (price === null) throw new Error("Não foi possível extrair o preço do produto.");

  const images: string[] = [];
  const pushImage = (raw: string) => {
    const normalized = normalizeUrl(raw, base);
    if (normalized && !images.includes(normalized)) images.push(normalized);
  };

  for (const content of metaContentAll(html, "og:image")) pushImage(content);
  for (const content of metaContentAll(html, "og:image:url")) pushImage(content);

  if (product) {
    const img = product["image"];
    if (typeof img === "string") pushImage(img);
    else if (Array.isArray(img)) for (const i of img) if (typeof i === "string") pushImage(i);
    const imageArray = product["image"] as unknown;
    if (typeof imageArray === "object" && imageArray !== null && !Array.isArray(imageArray)) {
      const urlVal = (imageArray as Record<string, unknown>)["url"];
      if (typeof urlVal === "string") pushImage(urlVal);
    }
  }

  const fallbackImage = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*[Pp]roduct[^"']*["']/i)?.[1];
  if (fallbackImage) pushImage(fallbackImage);

  let description =
    metaContent(html, "description") ??
    metaContent(html, "og:description") ??
    product?.description?.toString() ??
    "";
  description = decodeEntities(description).trim();

  if (!name) throw new Error("Não foi possível extrair o nome do produto.");

  return {
    name,
    price,
    compareAtPrice,
    images: images.slice(0, 6),
    description,
    source: url.host,
  };
}
