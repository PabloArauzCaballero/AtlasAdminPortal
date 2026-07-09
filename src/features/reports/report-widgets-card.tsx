import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { safeText } from "@/shared/lib/format";
import type { ReportWidget } from "./types";

export function ReportWidgetsCard({
  widgets,
}: Readonly<{ widgets: ReportWidget[] }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Widgets configurados"
          description="La definición visual viene desde BD; el portal solo renderiza la configuración recibida."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {widgets.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {widgets.map((widget) => (
              <article
                key={widget.widgetId}
                className="rounded-lg border border-atlas-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-atlas-text">
                      {widget.title}
                    </h3>
                    <p className="mt-1 text-xs text-atlas-muted">
                      {safeText(widget.description)}
                    </p>
                  </div>
                  <Badge>{widget.widgetType}</Badge>
                </div>
                <p className="mt-3 font-mono text-xs text-atlas-muted">
                  Query: {safeText(widget.queryKey)}
                </p>
                <div className="mt-3">
                  <JsonViewer value={widget.visualConfig} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-atlas-muted">
            No hay widgets configurados para este reporte.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
