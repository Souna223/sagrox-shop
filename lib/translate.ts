const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const cache = new Map<string, string>();

async function translateWithGoogle(text: string): Promise<string> {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target: "pt", format: "text" }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  return data?.data?.translations?.[0]?.translatedText ?? "";
}

async function translateWithFreeEndpoint(text: string): Promise<string> {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`,
  );
  if (!res.ok) return "";
  const data = (await res.json()) as Array<Array<Array<string | null>>>;
  const segments = data?.[0] ?? [];
  return segments.map((s) => s?.[0] ?? "").join("");
}

export async function translateToPortuguese(text: string): Promise<string> {
  const input = (text ?? "").trim();
  if (!input || input.length < 4) return text;
  if (cache.has(input)) return cache.get(input) ?? text;
  try {
    const out = API_KEY ? await translateWithGoogle(input) : await translateWithFreeEndpoint(input);
    const clean = out.trim();
    cache.set(input, clean);
    return clean || input;
  } catch {
    return input;
  }
}
