import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { safeText } from "@/shared/lib/format";
import type { ReportDefinition } from "./types";

export function ReportSummaryCard({
  report,
}: Readonly<{ report: ReportDefinition }>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-atlas-text">
              {report.name}
            </h2>
            <p className="mt-1 text-sm text-atlas-muted">
              {safeText(report.description)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={report.status} />
            <RiskBadge value={report.criticality} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <KeyValueGrid
          items={[
            { label: "Código", value: report.key, mono: true },
            { label: "Dominio", value: report.domain },
            { label: "Dueño", value: report.owner },
            { label: "Fuente", value: report.sourceType },
            { label: "Referencia", value: report.sourceReference, mono: true },
          ]}
        />
        <p className="text-sm text-atlas-muted">
          Permisos necesarios:{" "}
          <span className="font-mono text-xs text-atlas-text">
            {requiredPermissions(report).join(", ") || "—"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

/** `permissions.required` del informe; los filtros ya se ven como campos al calcularlo. */
function requiredPermissions(report: ReportDefinition): string[] {
  const required = report.permissions?.required;
  return Array.isArray(required) ? required.map(String) : [];
}
