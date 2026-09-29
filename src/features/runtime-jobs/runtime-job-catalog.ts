import { DATA_LIFECYCLE_JOBS } from "./runtime-job-catalog-data-jobs";
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
const QUEUE_JOBS: readonly RuntimeJobDefinition[] = [
  {
    code: "dispatch-loan-outcomes",
    title: "Entregar desenlaces al Motor",
    systems:
      "Envía al Motor, de una vez, los resultados de préstamos que esperan entrega (cómo terminó cada préstamo en su ventana de seguimiento). El Motor descarta los repetidos, así que volver a enviar un lote no causa problemas.",
    business:
      "Sin desenlaces el Motor mide su acierto sobre una muestra congelada. Este disparo adelanta la entrega tras una incidencia o cuando hay que recalibrar hoy.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de desenlaces",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (100).",
        placeholder: "100",
        min: 1,
        max: 500,
      },
    ],
  },
  {
    code: "sweep-debt-ratings",
    title: "Recalificar la cartera",
    systems:
      "Recorre los clientes con deuda viva y vuelve a calificar cada operación y su ficha con la política vigente.",
    business:
      "La categoría de riesgo y la previsión salen de los días de atraso; recalificar antes de un cierre evita que la contabilidad lea una foto de hace seis horas.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de clientes",
        hint: "Entre 1 y 5000. Vacío usa el valor por defecto (500).",
        placeholder: "500",
        min: 1,
        max: 5000,
      },
    ],
  },
  {
    code: "sweep-loan-delinquency",
    title: "Recalcular la mora",
    systems:
      "Recorre la cartera viva de tu organización, actualiza los días de atraso y el tramo de cada préstamo, y deja preparado un resultado para el Motor por cada ventana de seguimiento (30, 90 y 180 días) ya cumplida.",
    business:
      "La mora corre sola cada hora; adelantarla sirve antes de un cierre o tras una incidencia, para que calificación, cobranza y el Motor lean el atraso de hoy y no el de la última pasada.",
    destructive: false,
    path: "/operations/loans/delinquency-sweep",
    // El cuerpo se valida en modo estricto (sólo `limit`): un `dryRun` de más es un 400.
    supportsDryRun: false,
    fields: [
      {
        name: "limit",
        label: "Límite de préstamos",
        hint: "Entre 1 y 1000. Vacío usa el valor por defecto (200).",
        placeholder: "200",
        min: 1,
        max: 1000,
      },
    ],
  },
  {
    code: "process-outbox",
    title: "Enviar eventos pendientes",
    systems:
      "Envía los mensajes que esperan en la cola de eventos y los marca como enviados.",
    business:
      "Si la cola de eventos se atasca, hay eventos que nunca salieron: avisos o comunicaciones con otros sistemas que el negocio da por enviados y no lo están.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (50).",
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
      "Procesa los eventos entre procesos que siguen pendientes en la cola.",
    business:
      "Los eventos sin procesar dejan cálculos desactualizados: puntuaciones, totales y bandejas que se ven vacías aunque el hecho sí ocurrió.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de eventos",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (50).",
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
      "Marca como vencidas las sesiones sin actividad más allá del umbral. El resultado dice cuántas revisó, cuántas venció y desde qué hora contó la inactividad.",
    business:
      "Una sesión viva y olvidada es una puerta abierta. Expirarlas cierra el riesgo de que un dispositivo perdido siga operando.",
    destructive: true,
    fields: [
      {
        name: "maxIdleMinutes",
        label: "Inactividad máxima (minutos)",
        hint: "Entre 1 y 43200 (30 días). Vacío usa el valor por defecto (120).",
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
      "Actúa solo sobre cinco tipos de registro técnico: GPS de direcciones, datos de dispositivo (se anonimizan), uso de formularios, historial de procesos automáticos y registro de solicitudes. El resultado dice qué hizo en cada uno y qué políticas quedaron sin aplicar.",
    business:
      "Limpia datos operativos que ya no hacen falta. NO aplica todavía la retención de los datos personales del cliente, de riesgo, de auditoría, de notificaciones, de soporte ni de evidencia de proveedores: esas 13 políticas están pendientes de decisión de Legal, Riesgo y Cumplimiento, y la ejecución las lista como sin aplicar, sin tocarlas.",
    destructive: true,
    fields: [
      {
        name: "policyCode",
        label: "Código de política",
        hint: "Vacío aplica todas las políticas activas. Un código sólo actúa si su política está ACTIVA en Gobierno de datos › Retención; si no, la corrida no hace nada.",
        placeholder: "gps_observations_90d",
        options: RETENTION_POLICY_CODES,
      },
    ],
  },
  {
    code: "recalculate-data-quality",
    // El job del backend se llama «recalcular», pero hoy sólo CUENTA: no evalúa ninguna regla ni
    // crea incidencias (`issuesCreated` es siempre 0). El título y el texto dicen lo que hace.
    title: "Contar incidencias de calidad abiertas",
    systems:
      "Cuenta las incidencias de calidad abiertas. No evalúa las reglas ni crea incidencias nuevas: eso todavía no existe.",
    business:
      "Da la cifra de incidencias abiertas de toda la organización o de un cliente. No limpia ni llena la bandeja de «Alertas».",
    destructive: false,
    fields: [
      {
        name: "customerId",
        label: "ID de cliente",
        hint: "Vacío recalcula toda la organización. Solo dígitos.",
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
        hint: "Entre 1 y 1440. Vacío usa el valor por defecto (15).",
        placeholder: "15",
        min: 1,
        max: 1440,
      },
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (100).",
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
      "Entrega los mensajes recién creados por un aviso masivo. Solo tiene sentido si el sistema está configurado para entregar los avisos en diferido.",
    business:
      "Con entrega diferida, nadie despacha lo recién creado hasta que corre este proceso: el mensaje existe, está bien formado y sigue sin salir.",
    destructive: false,
    fields: [
      {
        name: "limit",
        label: "Límite de mensajes",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (100).",
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
      "Devuelve a la cola los eventos que quedaron «en proceso» porque el proceso que los tomó se cayó antes de terminarlos.",
    business:
      "Un evento varado ya no lo recoge nadie: se pierde en silencio y con él lo que disparaba (una puntuación, un aviso, un cálculo).",
    destructive: false,
    fields: [
      {
        name: "olderThanMinutes",
        label: "Antigüedad mínima (minutos)",
        hint: "Entre 1 y 1440. Vacío usa el valor por defecto (15). Recuperarlos demasiado pronto duplica entregas.",
        placeholder: "15",
        min: 1,
        max: 1440,
      },
      {
        name: "limit",
        label: "Límite de eventos",
        hint: "Entre 1 y 500. Vacío usa el valor por defecto (100).",
        placeholder: "100",
        min: 1,
        max: 500,
      },
    ],
  },
];

/**
 * El catálogo completo, en el orden declarado: primero lo que mueve cola, después lo que toca
 * dato persistido.
 */
export const RUNTIME_JOBS: readonly RuntimeJobDefinition[] = [
  ...QUEUE_JOBS,
  ...DATA_LIFECYCLE_JOBS,
];

export function findRuntimeJob(code: string): RuntimeJobDefinition | undefined {
  return RUNTIME_JOBS.find((job) => job.code === code);
}
