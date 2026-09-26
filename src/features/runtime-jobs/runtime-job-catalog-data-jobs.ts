import type { RuntimeJobDefinition } from "./types";

/**
 * Los jobs del final de la lista: los que tocan o borran dato ya persistido.
 *
 * Van aparte de `runtime-job-catalog.ts` porque el catálogo entero pasaba de las 300 líneas que
 * admite `yarn max-lines`. El corte respeta el orden que el catálogo declara —de menor a mayor
 * impacto—: aquí empieza lo que ya no es mover cola.
 */
export const DATA_LIFECYCLE_JOBS: readonly RuntimeJobDefinition[] = [
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
