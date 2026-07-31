"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return "pt";
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  return match?.[1] === "en" ? "en" : "pt";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    setLocaleState(readCookieLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const t = dictionaries[locale];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
