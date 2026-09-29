import { findRuntimeJob } from "@/features/runtime-jobs/runtime-job-catalog";
import type { Option } from "@/shared/lib/options";

/**
 * Los estados que escribe `job-run-recorder` en AtlasBackend: una corrida nace `running` y termina
 * `completed` o `failed`. El backend los publica en mayúsculas.
 *
 * Antes el desplegable se armaba con los valores de la PÁGINA visible: con miles de corridas
 * completadas, «Fallido» no aparecía nunca como opción aunque hubiera corridas fallidas más abajo.
 */
export const JOB_STATUS_OPTIONS: Option[] = [
  {
    value: "FAILED",
    label: "Fallida",
    description: "Terminó con error; el detalle trae el mensaje.",
  },
  {
    value: "RUNNING",
    label: "En ejecución",
    description: "Empezó y todavía no terminó.",
  },
  {
    value: "COMPLETED",
    label: "Completada",
    description: "Terminó sin ningún error.",
  },
];

/** Quién disparó la corrida (`triggered_by_type`). */
export const JOB_QUEUE_OPTIONS: Option[] = [
  {
    value: "system",
    label: "Programada",
    description: "La lanzó el planificador del sistema.",
  },
  {
    value: "internal_user",
    label: "Manual",
    description:
      "La lanzó una persona desde Procesos automáticos › Ejecutar ahora.",
  },
];

const QUEUE_LABELS: Record<string, string> = Object.fromEntries(
  JOB_QUEUE_OPTIONS.map((option) => [option.value, option.label]),
);

/** Procesos que corren solos y no se disparan a mano, así que no están en el catálogo manual. */
const SCHEDULED_ONLY: Record<string, string> = {
  run_notification_campaigns: "Enviar campañas programadas",
  systems_qa_journey_run: "Recorrido de QA",
};

/**
 * El nombre del proceso en español. El backend publica el código (`deliver_pending_notifications`)
 * y su versión con espacios, que seguía siendo inglés; el mismo proceso ya tiene nombre en el
 * catálogo de «Ejecutar ahora» de Jobs, con guiones en vez de guiones bajos.
 */
export function jobDisplayName(jobKey: string, fallback: string): string {
  return (
    findRuntimeJob(jobKey.replace(/_/g, "-"))?.title ??
    SCHEDULED_ONLY[jobKey] ??
    fallback
  );
}

export function jobQueueLabel(queue: string | null): string {
  if (!queue) return "—";
  return QUEUE_LABELS[queue] ?? queue;
}

/** Duración legible: «850 ms», «12,4 s», «3 min 5 s». */
export function formatJobDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs)) return "—";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60)
    return `${seconds.toLocaleString("es-BO", { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}
