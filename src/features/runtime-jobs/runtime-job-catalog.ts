import type { RuntimeJobDefinition } from "./types";

/**
 * Códigos conocidos de `RETENTION_TARGETS` en el backend
 * (`runtime-jobs.service.ts`). Se ofrecen como sugerencia, no como lista
 * cerrada: el campo sigue siendo texto libre porque el backend acepta
 * cualquier `policyCode` y responde con `unmappedPolicies` si no lo conoce.
 */
export const RETENTION_POLICY_CODES = [
  "gps_observations_90d",
  "device_snapshots_90d",
  "form_interaction_events_60d",
] as const;

/**
 * Los 5 jobs de `RuntimeJobsController`. El orden es el de menor a mayor
 * impacto: los dos primeros mueven cola, el resto toca datos persistidos.
 */
export const RUNTIME_JOBS: readonly RuntimeJobDefinition[] = [
  {
    code: "process-outbox",
    title: "Procesar outbox",
    systems:
      "Drena los mensajes pendientes del patrón outbox y los marca como despachados.",
    business:
      "Si el outbox se atasca, hay eventos que nunca salieron: notificaciones, integraciones o webhooks que el negocio da por enviados y no lo están.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el default del backend (50).",
        placeholder: "50",
      },
    ],
  },
  {
    code: "process-events",
    title: "Procesar eventos pendientes",
    systems:
      "Consume la cola de eventos de dominio pendientes con el worker `runtime_jobs_process_events`.",
    business:
      "Los eventos sin procesar dejan derivados desactualizados: scores, agregados y bandejas que se ven vacías aunque el hecho sí ocurrió.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de eventos",
        hint: "Entre 1 y 500. Vacío usa el default del backend (50).",
        placeholder: "50",
      },
    ],
  },
  {
    code: "expire-stale-sessions",
    title: "Expirar sesiones inactivas",
    systems:
      "Marca como expiradas las sesiones sin actividad más allá del umbral. Devuelve `selected`, `expired` y el `cutoff` aplicado.",
    business:
      "Una sesión viva y olvidada es una puerta abierta. Expirarlas cierra el riesgo de que un dispositivo perdido siga operando.",
    destructive: true,
    fields: [
      {
        name: "maxIdleMinutes",
        label: "Inactividad máxima (minutos)",
        hint: "Entre 1 y 43200 (30 días). Vacío usa el default del backend (120).",
        placeholder: "120",
      },
    ],
  },
  {
    code: "apply-retention-policies",
    title: "Aplicar políticas de retención",
    systems:
      "Ejecuta las políticas de retención: borra o anonimiza según el objetivo. Devuelve `outcomes` por tabla y `unmappedPolicies`.",
    business:
      "Es el job que hace real la promesa de retención frente al regulador. No correrlo acumula datos que ya no se deberían conservar.",
    destructive: true,
    fields: [
      {
        name: "policyCode",
        label: "Código de política",
        hint: "Vacío aplica todas las políticas mapeadas. Máximo 120 caracteres.",
        placeholder: "gps_observations_90d",
        options: RETENTION_POLICY_CODES,
      },
    ],
  },
  {
    code: "recalculate-data-quality",
    title: "Recalcular calidad de datos",
    systems:
      "Reevalúa las reglas de calidad y devuelve el conteo de issues abiertos.",
    business:
      "Sincera la bandeja de calidad: sin esto, los issues ya corregidos siguen contando como abiertos y los nuevos no aparecen.",
    destructive: false,
    fields: [
      {
        name: "customerId",
        label: "ID de cliente",
        hint: "Vacío recalcula todo el tenant. Solo dígitos.",
        placeholder: "1234",
      },
    ],
  },
];

export function findRuntimeJob(code: string): RuntimeJobDefinition | undefined {
  return RUNTIME_JOBS.find((job) => job.code === code);
}
