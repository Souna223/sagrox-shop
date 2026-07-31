export function buildCatalogUrl(
  basePath: string,
  params: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "" || value === "0") next.delete(key);
    else next.set(key, value);
  }
  next.delete("pagina");
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
