import { Card, CardContent } from "@/shared/components/ui/card";
import { formatNumber, safeText } from "@/shared/lib/format";

export function MetricCard({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: unknown; hint?: string }>) {
  return (
    <Card interactive>
      <CardContent className="p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-atlas-muted">
          {label}
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.035em] text-atlas-text">
          {typeof value === "number" ? formatNumber(value) : safeText(value)}
        </p>
        {hint ? <p className="mt-1 text-xs text-atlas-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
