import type { CustomerAuditSourceTable } from "./types";

/** Etiquetas de las 8 tablas origen de `audit_event_feed`. */
const sourceTableLabels: Record<CustomerAuditSourceTable, string> = {
  operational_audit_log: "Auditoría operativa",
  data_change_log: "Cambio de datos",
  auth_event: "Autenticación",
  consent_event: "Consentimiento",
  customer_action_log: "Acción del cliente",
  customer_status_event: "Cambio de estado",
  fraud_case_event: "Caso de fraude",
  manual_review_event: "Revisión manual",
};

export function sourceTableLabel(value: string): string {
  return sourceTableLabels[value as CustomerAuditSourceTable] ?? value;
}

/** Etiquetas de los tipos de evento del endpoint deprecado (conjunto acotado). */
const eventTypeLabels: Record<string, string> = {
  status: "Cambio de estado",
  auth: "Autenticación",
  consent: "Consentimiento",
  manual_review: "Revisión manual",
  fraud: "Fraude",
  data_change: "Cambio de datos",
  customer_action: "Acción del cliente",
  operational_audit: "Auditoría operativa",
};

export function eventTypeLabel(value: string): string {
  return eventTypeLabels[value] ?? value;
}

/**
 * Opciones filtrables del endpoint deprecado. Se omiten a propósito:
 * - `risk`: está en el enum del backend pero no tiene rama en el repositorio,
 *   así que filtrar por él devuelve 0 eventos siempre.
 * - `operational_audit`: no es un valor aceptado por el enum; esos eventos solo
 *   aparecen cuando el filtro es "Todos".
 */
export const eventTypeOptions = [
  "status",
  "auth",
  "consent",
  "manual_review",
  "fraud",
  "data_change",
  "customer_action",
].map((value) => ({ label: eventTypeLabel(value), value }));
