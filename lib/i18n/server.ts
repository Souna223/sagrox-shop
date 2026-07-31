import { cookies } from "next/headers";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return value === "en" ? "en" : "pt";
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
