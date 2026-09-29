import { MetricCard } from "@/shared/components/layout/metric-card";
import type { ProcessDetail } from "./types";

/**
 * Los contadores del proceso: pasos, cuántos tienen flujo en el mapa de rutas, cuántos son de
 * riesgo crítico y cuántos están verificados con uso real. Salen del servidor (`flowStats`); con
 * un servidor anterior que no los manda se dice «—», nunca un cero inventado.
 */
export function ProcessFlowCounters({
  process,
}: Readonly<{ process: Pick<ProcessDetail, "stages" | "flowStats"> }>) {
  const steps = process.stages.reduce(
    (total, stage) => total + stage.steps.length,
    0,
  );
  const stats = process.flowStats;
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Pasos" value={steps} hint="En todas sus etapas" />
      <MetricCard
        label="Con flujo en el mapa"
        value={stats?.linked ?? "—"}
        hint="Pasos cuya operación existe en el mapa de rutas"
      />
      <MetricCard
        label="Críticos"
        value={stats?.critical ?? "—"}
        tone={stats?.critical ? "warning" : undefined}
        hint="Operaciones de riesgo crítico"
      />
      <MetricCard
        label="Verificados"
        value={stats?.verified ?? "—"}
        hint="Comprobados con uso real"
      />
    </div>
  );
}
