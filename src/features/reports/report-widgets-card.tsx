import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { safeText } from "@/shared/lib/format";
import type { ReportWidget } from "./types";

/**
 * Qué apartados trae el informe. Decía que «la definición visual viene desde BD»: viene de
 * `portal-report-definitions.ts` en AtlasBackend, no de ninguna tabla. Y enseñaba el `queryKey`, el
 * tipo de gráfico y la configuración en JSON, que no le dicen nada a quien lee el informe.
 */
export function ReportWidgetsCard({
  widgets,
}: Readonly<{ widgets: ReportWidget[] }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Qué calcula"
          description="Los apartados que salen al calcular el informe."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {widgets.length ? (
          <ul className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {widgets.map((widget) => (
              <li
                key={widget.widgetId}
                className="rounded-lg border border-atlas-border p-4"
              >
                <h3 className="text-sm font-semibold text-atlas-text">
                  {widget.title}
                </h3>
                <p className="mt-1 text-xs text-atlas-muted">
                  {safeText(widget.description)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-atlas-muted">
            Este informe no declara apartados.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
