import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import type { QaRunStepCounts, QaRunSummary } from "./types";

/**
 * Clave de endpoint, idéntica a `endpointKey()` del backend: método en mayúsculas + ruta con cada
 * parámetro como `:param` y sin barra final. `{{resources.customerId}}` y `:customerId` quedan
 * igual, así que el nodo del árbol y el paso de la receta se encuentran aunque sus códigos de paso
 * difieran entre flujos.
 */
export function endpointKey(method: string, path: string): string {
  const normalized = path
    .replace(/\{\{\s*[a-zA-Z]+\.([a-zA-Z0-9_]+)\s*\}\}/g, ":$1")
    .replace(/:[a-zA-Z0-9_]+/g, ":param")
    .replace(/\/+$/, "");
  return `${method.toUpperCase()} ${normalized}`;
}

/**
 * Conteos por endpoint (`steps[].endpoint`). Si varios pasos de la receta llaman al mismo endpoint
 * —y por tanto caen en el mismo nodo—, se suman.
 */
export function stepCountsByEndpoint(
  run: QaRunSummary | undefined,
): Map<string, QaRunStepCounts> {
  const byEndpoint = new Map<string, QaRunStepCounts>();
  for (const step of run?.steps ?? []) {
    if (!step.endpoint) continue;
    const current = byEndpoint.get(step.endpoint);
    if (!current) {
      byEndpoint.set(step.endpoint, { ...step });
      continue;
    }
    current.passed += step.passed;
    current.failed += step.failed;
    current.skipped += step.skipped;
    current.notApplicable += step.notApplicable;
    current.indeterminate += step.indeterminate;
    current.cancelled += step.cancelled;
  }
  return byEndpoint;
}

export function stepTotal(counts: QaRunStepCounts): number {
  return (
    counts.passed +
    counts.failed +
    counts.skipped +
    counts.notApplicable +
    counts.indeterminate +
    counts.cancelled
  );
}

/**
 * El tono de un paso según TODAS las personas: verde sólo si ninguna falló ni quedó sin conclusión
 * y al menos una lo aprobó. Una persona verde entre cien rojas no pinta el paso de verde.
 */
export function stepTone(
  counts: QaRunStepCounts,
): "passed" | "failed" | "mixed" | "none" {
  if (counts.failed > 0 && counts.passed === 0) return "failed";
  if (counts.failed > 0 || counts.indeterminate > 0) return "mixed";
  if (counts.passed > 0) return "passed";
  return "none";
}

const COUNT_COLUMNS: Array<{
  key:
    | "passed"
    | "failed"
    | "skipped"
    | "notApplicable"
    | "indeterminate"
    | "cancelled";
  header: string;
  className?: string;
}> = [
  { key: "passed", header: "Aprobaron", className: "text-emerald-700" },
  { key: "failed", header: "Fallaron", className: "text-red-700" },
  { key: "skipped", header: "Omitidos" },
  { key: "notApplicable", header: "No aplica" },
  { key: "indeterminate", header: "Sin conclusión" },
  { key: "cancelled", header: "Cancelados" },
];

const COLUMNS: ColumnDef<QaRunStepCounts>[] = [
  {
    id: "step",
    header: "Paso",
    accessorFn: (step) => step.stepKey,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.stepKey}</span>
    ),
  },
  ...COUNT_COLUMNS.map(
    ({ key, header, className }): ColumnDef<QaRunStepCounts> => ({
      id: key,
      header,
      accessorFn: (step) => step[key],
      cell: ({ row }) => (
        <span className={`tabular-nums ${className ?? ""}`}>
          {row.original[key]}
        </span>
      ),
    }),
  ),
];

/**
 * Resultado por paso de la receta, con su distribución. Los pasos llegan enteros dentro del
 * resumen de la corrida (son los de la receta, no crecen con las personas), así que no hay
 * paginación ni buscador propios.
 */
export function RunStepCounts({ run }: Readonly<{ run: QaRunSummary }>) {
  if (run.steps.length === 0) return null;
  return (
    <section aria-label="Resultado por paso" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        Resultado por paso
      </h3>
      <DataTable data={run.steps} columns={COLUMNS} />
    </section>
  );
}
