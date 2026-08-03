export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
