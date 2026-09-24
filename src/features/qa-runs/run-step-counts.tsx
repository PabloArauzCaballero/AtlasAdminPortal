import type { QaRunStepCounts, QaRunSummary } from "./types";

/** Conteos por paso del flujo (`workflowStepCode`). Varios pasos de receta pueden caer en uno. */
export function stepCountsByWorkflowCode(
  run: QaRunSummary | undefined,
): Map<string, QaRunStepCounts> {
  const byCode = new Map<string, QaRunStepCounts>();
  for (const step of run?.steps ?? []) {
    if (!step.workflowStepCode) continue;
    const current = byCode.get(step.workflowStepCode);
    if (!current) {
      byCode.set(step.workflowStepCode, { ...step });
      continue;
    }
    current.passed += step.passed;
    current.failed += step.failed;
    current.skipped += step.skipped;
    current.notApplicable += step.notApplicable;
    current.indeterminate += step.indeterminate;
    current.cancelled += step.cancelled;
  }
  return byCode;
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
