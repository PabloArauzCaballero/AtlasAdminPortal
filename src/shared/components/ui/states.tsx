import { AlertTriangle, Ban, Loader2, SearchX } from "lucide-react";
import { Button } from "./button";

export function LoadingSkeleton({ rows = 6 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="relative h-12 overflow-hidden rounded-xl border border-atlas-border bg-slate-100"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          {/* transform-based sweep (compositor-only) instead of animating background-position, which forces a repaint every frame and used to run simultaneously across every row */}
          <div className="absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-56 animate-fade-in flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-subtle">
      <div className="mb-4 rounded-full border border-slate-200 bg-atlas-accentSoft p-3">
        <SearchX className="h-7 w-7 text-atlas-accent" />
      </div>
      <h3 className="text-base font-semibold text-atlas-text">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-atlas-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "No se pudo cargar la información.",
  description,
  requestId,
  onRetry,
}: Readonly<{
  title?: string;
  description?: string;
  requestId?: string;
  onRetry?: () => void;
}>) {
  return (
    <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-subtle">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 p-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-red-700">{description}</p>
          ) : null}
          {requestId ? (
            <p className="mt-2 font-mono text-xs text-red-700">
              Request ID: {requestId}
            </p>
          ) : null}
          {onRetry ? (
            <Button className="mt-4" variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ForbiddenState({
  message = "No tienes permisos para ver esta sección.",
}: Readonly<{ message?: string }>) {
  return (
    <div className="flex min-h-64 animate-fade-in flex-col items-center justify-center rounded-2xl border border-atlas-border bg-white p-8 text-center shadow-subtle">
      <div className="mb-4 rounded-full border border-slate-200 bg-slate-50 p-3">
        <Ban className="h-7 w-7 text-atlas-muted" />
      </div>
      <h3 className="text-base font-semibold text-atlas-text">
        Acceso restringido
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-atlas-muted">
        {message}
      </p>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-atlas-mesh text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm text-slate-300">Preparando portal interno…</p>
      </div>
    </div>
  );
}
