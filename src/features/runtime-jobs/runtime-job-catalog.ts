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
 * Los jobs que un operador puede disparar a mano. El orden es el de menor a
 * mayor impacto: primero los que mueven cola, después los que tocan datos
 * persistidos y por último los que borran.
 *
 * Todos existen además como trabajo programado en el backend
 * (`scheduled-jobs.catalog.ts`); esta pantalla es el disparo manual para cuando
 * hay que adelantar una tanda o comprobar una hipótesis en un incidente.
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
        min: 1,
        max: 500,
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
        min: 1,
        max: 500,
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
        min: 1,
        max: 43200,
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
  {
    code: "retry-stuck-notifications",
    title: "Reintentar notificaciones atascadas",
    systems:
      "Reencola los mensajes que quedaron a medio entregar tras un reinicio, por el MISMO orquestador que la entrega normal.",
    business:
      "Un mensaje atascado es un aviso que el cliente nunca recibió y que el sistema da por enviado: un código que no llegó, una alerta de cobro que nadie vio.",
    destructive: false,
    fields: [
      {
        name: "olderThanMinutes",
        label: "Antigüedad mínima (minutos)",
        hint: "Entre 1 y 1440. Vacío usa el default del backend (15).",
        placeholder: "15",
        min: 1,
        max: 1440,
      },
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el default del backend (100).",
        placeholder: "100",
        min: 1,
        max: 500,
      },
    ],
  },
  {
    code: "deliver-pending-notifications",
    title: "Entregar notificaciones pendientes",
    systems:
      "Entrega los mensajes recién creados por un broadcast. Sólo tiene sentido con `NOTIFICATIONS_DELIVERY_MODE=deferred`.",
    business:
      "Con entrega diferida, nadie despacha lo recién creado hasta que corre este job: el mensaje existe, está bien formado y sigue sin salir.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el default del backend (100).",
        placeholder: "100",
        min: 1,
        max: 500,
      },
    ],
  },
  {
    code: "reclaim-stuck-events",
    title: "Recuperar eventos varados",
    systems:
      "Devuelve a la cola los eventos que quedaron en `processing` porque el proceso que los reclamó murió antes de resolverlos.",
    business:
      "Un evento varado no lo mira ninguna consulta de reclamo: se pierde en silencio y con él lo que disparaba (un score, una notificación, un derivado).",
    destructive: false,
    fields: [
      {
        name: "olderThanMinutes",
        label: "Antigüedad mínima (minutos)",
        hint: "Entre 1 y 1440. Vacío usa el default del backend (15). Reclamar demasiado pronto duplica entregas.",
        placeholder: "15",
        min: 1,
        max: 1440,
      },
      {
        name: "limit",
        label: "Límite de eventos",
        hint: "Entre 1 y 500. Vacío usa el default del backend (100).",
        placeholder: "100",
        min: 1,
        max: 500,
      },
    ],
  },
  {
    code: "mark-abandoned-onboardings",
    title: "Cerrar onboardings abandonados",
    systems:
      "Marca como `abandoned` los flujos sin terminar cuya ÚLTIMA ACTIVIDAD supera el umbral. Cierra el flujo, no al cliente: quien dejó el registro a medias puede volver y retomar.",
    business:
      "Sin este cierre no existe tasa de abandono, que es la métrica que dice si el registro funciona: los flujos se quedaban en `in_progress` para siempre.",
    destructive: false,
    path: "/customer-onboarding/jobs/mark-abandoned",
    // Su cuerpo se valida en modo estricto: un `dryRun` de más es un 400.
    supportsDryRun: false,
    fields: [
      {
        name: "olderThanDays",
        label: "Inactividad mínima (días)",
        hint: "Entre 1 y 365. Vacío usa el default del backend (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de flujos",
        hint: "Entre 1 y 2000. Vacío usa el default del backend (500).",
        placeholder: "500",
        min: 1,
        max: 2000,
      },
    ],
  },
  {
    code: "purge-idempotency-keys",
    title: "Purgar claves de idempotencia",
    systems:
      "Borra las claves ya resueltas más antiguas que la retención indicada.",
    business:
      "La tabla crece sin techo en la ruta más caliente de escritura. Purgar demasiado pronto es peor: convierte un reintento legítimo en una segunda ejecución del comando.",
    destructive: true,
    fields: [
      {
        name: "retentionDays",
        label: "Retención (días)",
        hint: "Entre 1 y 365. Vacío usa el default del backend (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de filas",
        hint: "Entre 1 y 10000. Vacío usa el default del backend (1000).",
        placeholder: "1000",
        min: 1,
        max: 10000,
      },
    ],
  },
  {
    code: "purge-processed-outbox",
    title: "Purgar outbox ya procesado",
    systems:
      "Borra los eventos de outbox en estado `processed` pasada su retención.",
    business:
      "El outbox drenado seguía acumulando filas para siempre y degradaba el índice con el que se reclaman los pendientes; pasada la ventana, esa evidencia ya no sirve para diagnosticar.",
    destructive: true,
    fields: [
      {
        name: "retentionDays",
        label: "Retención (días)",
        hint: "Entre 1 y 365. Vacío usa el default del backend (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de filas",
        hint: "Entre 1 y 10000. Vacío usa el default del backend (1000).",
        placeholder: "1000",
        min: 1,
        max: 10000,
      },
    ],
  },
];

export function findRuntimeJob(code: string): RuntimeJobDefinition | undefined {
  return RUNTIME_JOBS.find((job) => job.code === code);
}
