import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  eyebrow?: string;
  /**
   * Icono del módulo. No es decoración: en un portal de noventa vistas cuyas cabeceras comparten
   * tipografía y color, es la única señal que distingue una pantalla de otra antes de leerla.
   */
  icon?: LucideIcon;
  actions?: React.ReactNode;
}>) {
  return (
    <header className="relative mb-6 animate-fade-in overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card">
      <div className="pointer-events-none absolute inset-0 bg-atlas-radial" />
      {/* Filo superior de acento: da profundidad a la tarjeta sin añadir una línea de texto más. */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-atlas-accent via-indigo-400 to-transparent" />
      <div className="relative border-b border-atlas-border bg-gradient-to-br from-white via-slate-50 to-slate-100 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            {Icon ? (
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-glow sm:flex">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-atlas-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-atlas-accent" />
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="break-words text-2xl font-bold tracking-tight text-atlas-text md:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-4xl text-sm leading-6 text-atlas-muted">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  className,
}: Readonly<{
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}>) {
  return (
    <div className={cn("mb-3", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-atlas-accent" aria-hidden />
        ) : null}
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-atlas-muted">{description}</p>
      ) : null}
    </div>
  );
}
