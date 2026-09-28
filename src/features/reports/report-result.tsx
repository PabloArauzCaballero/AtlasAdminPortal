import { formatNumber } from "@/shared/lib/format";
import type {
  ReportRunResult,
  ReportWidgetData,
  ReportWidgetEntry,
} from "./types";

function isWidgetData(value: unknown): value is ReportWidgetData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { entries?: unknown }).entries)
  );
}

function formatValue(value: ReportWidgetEntry["value"]): string {
  return typeof value === "number" ? formatNumber(value) : value;
}

/**
 * El resultado de un informe, widget a widget, como líneas «etiqueta — valor».
 *
 * Un widget que llega sin `entries` es de un backend anterior (los cuatro informes devolvían el
 * mismo semáforo de release): se dice que no hay datos en vez de pintar su JSON.
 */
export function ReportResult({
  widgets,
}: Readonly<{ widgets: ReportRunResult["widgets"] }>) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {widgets.map((widget) => (
        <section
          key={widget.widgetId}
          className="rounded-lg border border-atlas-border p-4"
          aria-label={widget.title}
        >
          <h3 className="text-sm font-semibold text-atlas-text">
            {widget.title}
          </h3>
          {isWidgetData(widget.data) && widget.data.entries.length > 0 ? (
            <dl className="mt-3 divide-y divide-atlas-border">
              {widget.data.entries.map((entry) => (
                <div
                  key={entry.label}
                  className="flex items-baseline justify-between gap-4 py-1.5 text-sm"
                >
                  <dt className="text-atlas-muted">{entry.label}</dt>
                  <dd className="font-medium tabular-nums text-atlas-text">
                    {formatValue(entry.value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-atlas-muted">
              No hay datos para este apartado con los filtros elegidos.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
