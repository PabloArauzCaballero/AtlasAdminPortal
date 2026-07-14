import type {
  FraudDecision,
  ManualReviewDecision,
  NextCustomerStatus,
} from "./types";

export const MANUAL_REVIEW_DECISIONS: {
  value: ManualReviewDecision;
  label: string;
}[] = [
  { value: "approved", label: "Aprobar" },
  { value: "rejected", label: "Rechazar" },
  { value: "request_more_information", label: "Pedir más información" },
  { value: "escalated_to_fraud", label: "Escalar a fraude" },
  { value: "no_action", label: "Sin acción" },
];

export const FRAUD_DECISIONS: { value: FraudDecision; label: string }[] = [
  { value: "confirmed_fraud", label: "Fraude confirmado" },
  { value: "false_positive", label: "Falso positivo" },
  { value: "needs_more_investigation", label: "Necesita más investigación" },
  { value: "blocked", label: "Bloquear" },
  { value: "escalated", label: "Escalar" },
];

export const NEXT_STATUS_OPTIONS: {
  value: NextCustomerStatus;
  label: string;
}[] = [
  { value: "approved_for_next_step", label: "Aprobado — siguiente paso" },
  { value: "rejected", label: "Rechazado" },
  { value: "pending_more_information", label: "Pendiente de información" },
  { value: "pending_fraud_review", label: "Pendiente revisión de fraude" },
  { value: "registered", label: "Registrado" },
  { value: "blocked", label: "Bloqueado" },
];

export const FRAUD_NEXT_STATUS_VALUES: NextCustomerStatus[] = [
  "blocked",
  "pending_fraud_review",
  "registered",
  "approved_for_next_step",
];
