import { cn } from "@/lib/utils";

/** The soft white card every dashboard block sits in: title, optional one-line description, optional actions. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  label,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section aria-label={label ?? title} className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
