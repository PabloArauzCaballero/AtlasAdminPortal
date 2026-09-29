import {
  FRAUD_DECIDE_ROLE_LIST,
  MANUAL_REVIEW_DECIDE_ROLE_LIST,
  OPERATIONS_CASE_ROLE_LIST,
  WORK_QUEUE_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import type { WorkItemType } from "./types";

export type WorkQueueTab = "all" | WorkItemType;

/**
 * Las tres pestañas de la «Cola de trabajo», que absorbió «Revisión manual» y «Casos de fraude»
 * (la cola combinada era la unión de las otras dos). Cada pestaña conserva la nota y el «quién
 * puede» de la pantalla que sustituye, y se gatea por el mismo rol que tenía: `fraud_analyst`
 * sólo ve «Fraude», que es lo único que el servidor le deja leer.
 */
export const WORK_QUEUE_TABS: ReadonlyArray<{
  value: WorkQueueTab;
  label: string;
  roles: string[];
  note: string;
  whoCan: string;
}> = [
  {
    value: "all",
    label: "Todas",
    roles: OPERATIONS_CASE_ROLE_LIST,
    note: "Revisión manual y fraude juntas, del más reciente al más antiguo. Decidir un caso lo cierra de forma auditable y, si corresponde, cambia el estado del cliente.",
    whoCan: "operación, riesgo, cumplimiento y administración",
  },
  {
    value: "manual_review",
    label: "Revisión manual",
    roles: OPERATIONS_CASE_ROLE_LIST,
    note: "Altas con identidad o datos dudosos que decide una persona. Verlos: operación, riesgo, cumplimiento y administración; decidirlos: operación, riesgo y administración. Decidir un caso lo cierra y, si corresponde, cambia el estado del cliente.",
    whoCan: "operación, riesgo, cumplimiento y administración",
  },
  {
    value: "fraud",
    label: "Fraude",
    roles: WORK_QUEUE_ROLE_LIST,
    note: "Patrones de fraude detectados sobre clientes. Los ve cualquier rol de operación y los analistas de fraude; decidirlos es exclusivo de analistas de fraude y administración.",
    whoCan: "fraude, operación, riesgo, cumplimiento y administración",
  },
];

/** `?cola=` de la URL → pestaña. Un valor desconocido cae a «Todas». */
export function tabFromParam(value: string | null | undefined): WorkQueueTab {
  return WORK_QUEUE_TABS.some((tab) => tab.value === value)
    ? (value as WorkQueueTab)
    : "all";
}

/** Los roles que deciden cada tipo de caso: el `@Roles` de su ruta de decisión. */
export const DECIDE_ROLES: Record<WorkItemType, string[]> = {
  manual_review: MANUAL_REVIEW_DECIDE_ROLE_LIST,
  fraud: FRAUD_DECIDE_ROLE_LIST,
};

/**
 * La dirección nueva de una ruta vieja: `manual-review-cases` y `fraud-cases` son ahora pestañas
 * de la cola. Se conservan los parámetros que traiga el marcador o el enlace profundo.
 */
export function workQueueRedirectHref(
  cola: WorkItemType,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || key === "cola") continue;
    for (const item of Array.isArray(value) ? value : [value])
      params.append(key, item);
  }
  params.set("cola", cola);
  return `/internal/operations/work-queue?${params.toString()}`;
}
