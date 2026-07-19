import { cn } from "@/shared/lib/cn";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <header className="mb-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-atlas-accent">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="break-words text-2xl font-semibold tracking-[-0.025em] text-atlas-text md:text-[1.75rem] md:leading-9">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-atlas-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  className,
}: Readonly<{ title: string; description?: string; className?: string }>) {
  return (
    <div className={cn("mb-3", className)}>
      <h2 className="text-sm font-medium text-atlas-text">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-atlas-muted">{description}</p>
      ) : null}
    </div>
  );
}
