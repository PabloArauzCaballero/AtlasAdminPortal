import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatNumber, safeText } from "@/shared/lib/format";

type Tone = "default" | "success" | "warning" | "critical" | "info";

const TONES: Record<Tone, { tile: string; value: string }> = {
  default: { tile: "bg-atlas-soft text-atlas-muted", value: "text-atlas-text" },
  success: {
    tile: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
  },
  warning: { tile: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  critical: { tile: "bg-red-50 text-red-600", value: "text-red-700" },
  info: {
    tile: "bg-atlas-accentSoft text-atlas-accent",
    value: "text-atlas-text",
  },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: Readonly<{
  label: string;
  value: unknown;
  hint?: string;
  /** Icono de la magnitud. Distingue una cifra de otra sin obligar a leer su rótulo. */
  icon?: LucideIcon;
  /**
   * El tono no es estética: pinta la cifra según lo que significa. Un contador de incidencias
   * abiertas en el mismo gris que un contador de tablas obliga a leer los dos para saber cuál
   * pide atención.
   */
  tone?: Tone;
}>) {
  const styles = TONES[tone];
  return (
    <Card interactive className="group relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-atlas-accentSoft opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="relative flex items-start gap-3 p-4">
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
              styles.tile,
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums tracking-tight",
              styles.value,
            )}
          >
            {typeof value === "number" ? formatNumber(value) : safeText(value)}
          </p>
          {hint ? (
            <p className="mt-1 text-xs leading-4 text-atlas-muted">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
