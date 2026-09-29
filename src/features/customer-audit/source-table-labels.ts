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
