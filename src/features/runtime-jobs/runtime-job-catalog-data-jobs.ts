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
    title: "Cerrar altas abandonadas",
    systems:
      "Marca como abandonadas las altas sin terminar cuya ÚLTIMA ACTIVIDAD supera el umbral. Cierra el alta, no al cliente: quien dejó el registro a medias puede volver y retomarlo.",
    business:
      "Sin este cierre no existe tasa de abandono, que es la cifra que dice si el registro funciona: las altas se quedaban «en curso» para siempre.",
    destructive: false,
    path: "/customer-onboarding/jobs/mark-abandoned",
    // Su cuerpo se valida en modo estricto: un `dryRun` de más es un 400.
    supportsDryRun: false,
    fields: [
      {
        name: "olderThanDays",
        label: "Inactividad mínima (días)",
        hint: "Entre 1 y 365. Vacío usa el valor por defecto (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de altas",
        hint: "Entre 1 y 2000. Vacío usa el valor por defecto (500).",
        placeholder: "500",
        min: 1,
        max: 2000,
      },
    ],
  },
  {
    code: "purge-idempotency-keys",
    title: "Borrar comprobantes de repetición",
    systems:
      "Borra los comprobantes que usa el sistema para no ejecutar dos veces la misma orden, cuando ya están resueltos y son más antiguos que el plazo indicado.",
    business:
      "Estos comprobantes se acumulan sin límite en una de las partes más usadas del sistema. Borrarlos demasiado pronto es peor: un reintento legítimo se ejecutaría por segunda vez.",
    destructive: true,
    fields: [
      {
        name: "retentionDays",
        label: "Retención (días)",
        hint: "Entre 1 y 365. Vacío usa el valor por defecto (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de filas",
        hint: "Entre 1 y 10000. Vacío usa el valor por defecto (1000).",
        placeholder: "1000",
        min: 1,
        max: 10000,
      },
    ],
  },
  {
    code: "purge-processed-outbox",
    title: "Borrar eventos ya enviados",
    systems:
      "Borra de la cola de eventos los que ya se enviaron, una vez pasado su plazo de conservación.",
    business:
      "Los eventos ya enviados se acumulaban para siempre y hacían más lenta la búsqueda de los pendientes; pasado el plazo, esa evidencia ya no sirve para diagnosticar.",
    destructive: true,
    fields: [
      {
        name: "retentionDays",
        label: "Retención (días)",
        hint: "Entre 1 y 365. Vacío usa el valor por defecto (30).",
        placeholder: "30",
        min: 1,
        max: 365,
      },
      {
        name: "limit",
        label: "Límite de filas",
        hint: "Entre 1 y 10000. Vacío usa el valor por defecto (1000).",
        placeholder: "1000",
        min: 1,
        max: 10000,
      },
    ],
  },
];
