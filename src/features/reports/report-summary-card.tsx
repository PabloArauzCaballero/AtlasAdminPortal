import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
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
        <div className="grid gap-4 lg:grid-cols-2">
          <JsonViewer
            title="Filtros permitidos"
            value={report.allowedFilters}
          />
          <JsonViewer title="Permisos del reporte" value={report.permissions} />
        </div>
      </CardContent>
    </Card>
  );
}
