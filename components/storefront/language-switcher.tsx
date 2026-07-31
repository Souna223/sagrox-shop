"use client";

import { Languages, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/provider";
import { localeLabels, locales } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 text-sm" aria-label="Language">
            <Languages className="size-4" />
            <span className="uppercase">{locale}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)} className="justify-between gap-6">
            {localeLabels[l]}
            {locale === l ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
