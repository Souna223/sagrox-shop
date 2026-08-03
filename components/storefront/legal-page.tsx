import { PageHeader } from "@/components/storefront/page-header";

export type LegalSection = { title: string; paragraphs: string[] };

export function LegalPage({
  title,
  description,
  updated,
  sections,
}: {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {updated ? <p className="mb-10 text-xs text-muted-foreground">{updated}</p> : null}

        <div className="space-y-10">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                {section.title}
              </h2>
              <div className="mt-3 space-y-2">
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
