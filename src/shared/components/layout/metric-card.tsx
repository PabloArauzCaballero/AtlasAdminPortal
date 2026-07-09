import { Card, CardContent } from "@/shared/components/ui/card";
import { formatNumber, safeText } from "@/shared/lib/format";

export function MetricCard({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: unknown; hint?: string }>) {
  return (
    <Card interactive className="group relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-atlas-accentSoft opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="relative p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-atlas-text">
          {typeof value === "number" ? formatNumber(value) : safeText(value)}
        </p>
        {hint ? <p className="mt-1 text-xs text-atlas-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
