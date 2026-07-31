export function serializeRecord<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry && typeof entry === "object" && "toString" in entry) {
      const proto = Object.getPrototypeOf(entry)?.constructor?.name ?? "";
      if (proto === "Decimal") {
        result[key] = Number(entry.toString());
        continue;
      }
    }
    if (Array.isArray(entry)) {
      result[key] = entry.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? serializeRecord(item as Record<string, unknown>)
          : item,
      );
      continue;
    }
    result[key] = entry;
  }
  return result as T;
}
