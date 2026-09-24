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

/** Tabla compacta de pasos de la receta con su distribución. */
export function RunStepCounts({ run }: Readonly<{ run: QaRunSummary }>) {
  if (run.steps.length === 0) return null;
  return (
    <div className="atlas-scrollbar overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Resultado por paso</caption>
        <thead className="text-atlas-muted">
          <tr>
            <th className="py-1 pr-3 font-medium">Paso</th>
            <th className="py-1 pr-3 font-medium">Aprobaron</th>
            <th className="py-1 pr-3 font-medium">Fallaron</th>
            <th className="py-1 pr-3 font-medium">Omitidos</th>
            <th className="py-1 pr-3 font-medium">No aplica</th>
            <th className="py-1 pr-3 font-medium">Sin conclusión</th>
            <th className="py-1 font-medium">Cancelados</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {run.steps.map((step) => (
            <tr key={step.stepKey} className="border-t border-atlas-border">
              <td className="py-1 pr-3 font-mono">{step.stepKey}</td>
              <td className="py-1 pr-3 text-emerald-700">{step.passed}</td>
              <td className="py-1 pr-3 text-red-700">{step.failed}</td>
              <td className="py-1 pr-3">{step.skipped}</td>
              <td className="py-1 pr-3">{step.notApplicable}</td>
              <td className="py-1 pr-3">{step.indeterminate}</td>
              <td className="py-1">{step.cancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
