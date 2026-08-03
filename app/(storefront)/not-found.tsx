import type { Metadata } from "next";
import Link from "next/link";
import { Home, PackageSearch } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

export default async function StorefrontNotFound() {
  const t = await getDictionary();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p
        aria-hidden
        className="text-[9rem] font-extrabold leading-none tracking-tight text-primary/15 select-none sm:text-[11rem]"
      >
        404
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        {t.pages.notFoundTitle}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t.pages.notFoundMessage}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.pages.notFoundDescription}</p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Home className="size-4" />
          {t.pages.notFoundBackHome}
        </Link>
        <Link
          href="/produtos"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <PackageSearch className="size-4" />
          {t.pages.notFoundViewProducts}
        </Link>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        {t.pages.notFoundHelp}{" "}
        <Link
          href="/contato"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t.pages.notFoundContact}
        </Link>
      </p>
    </div>
  );
}
