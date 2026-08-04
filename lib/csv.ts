export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function detectDelimiter(sample: string): string {
  let best = ",";
  let bestCount = -1;
  for (const d of [",", ";", "\t"]) {
    const count = sample.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

export function decodeCsvBuffer(buf: Uint8Array): string {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  text = text.replace(/^\uFEFF/, "");
  if (text.includes("\uFFFD")) {
    text = Buffer.from(buf).toString("latin1").replace(/^\uFEFF/, "");
  }
  return text;
}

export function parseCsv(text: string): ParsedCsv {
  const first = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const delimiter = detectDelimiter(first);

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  const flushField = () => {
    current.push(field);
    field = "";
  };
  const flushRow = () => {
    rows.push(current);
    current = [];
  };

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
    } else if (ch === delimiter) {
      flushField();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      flushField();
      flushRow();
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || current.length > 0) {
    flushField();
    flushRow();
  }

  while (rows.length > 0 && rows[rows.length - 1].every((f) => f.trim() === "")) {
    rows.pop();
  }

  if (rows.length === 0) throw new Error("O arquivo CSV está vazio.");
  const headers = rows[0].map((h) => h.trim());
  const data = rows
    .slice(1)
    .filter((r) => r.some((f) => f.trim() !== ""));
  return { headers, rows: data };
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function splitList(raw: string): string[] {
  return (raw ?? "")
    .split(/[|;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const HTML_ENTITIES: Record<string, string> = {
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

export function decodeHtmlEntities(s: string): string {
  return s.replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => {
    if (m.startsWith("&#")) {
      return String.fromCharCode(Number(m.slice(2, -1)));
    }
    return HTML_ENTITIES[m] ?? m;
  });
}

export function htmlToText(html: string): string {
  let s = (html ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, "\n");
  s = s.replace(/<\/[a-z]+>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function extractHtmlImages(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html ?? "")) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export function toNumber(raw: string): number | null {
  const s = String(raw ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let norm = s;
  if (lastComma !== -1 && lastDot !== -1) {
    norm = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    norm = after === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export function toInt(raw: string): number | null {
  const n = toNumber(raw);
  if (n === null) return null;
  return Math.round(n);
}
