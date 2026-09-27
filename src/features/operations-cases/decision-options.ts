import type { Option } from "@/shared/lib/options";
import type {
  FraudDecision,
  ManualReviewDecision,
  NextCustomerStatus,
} from "./types";

type TypedOption<T extends string> = Option & { value: T };

export const MANUAL_REVIEW_DECISIONS: TypedOption<ManualReviewDecision>[] = [
  {
    value: "approved",
    label: "Aprobar",
    description:
      "La evidencia alcanza: el cliente sigue su alta sin más revisión.",
  },
  {
    value: "rejected",
    label: "Rechazar",
    description:
      "La evidencia no alcanza o es inválida; exige notas que lo justifiquen.",
  },
  {
    value: "request_more_information",
    label: "Pedir más información",
    description:
      "Falta un documento o dato: el cliente queda a la espera de aportarlo.",
  },
  {
    value: "escalated_to_fraud",
    label: "Escalar a fraude",
    description:
      "Hay señales de suplantación o abuso: pasa a la cola de analistas de fraude.",
  },
  {
    value: "no_action",
    label: "Sin acción",
    description:
      "Cierra el caso sin cambiar nada del cliente; p. ej. caso duplicado.",
  },
];

export const FRAUD_DECISIONS: TypedOption<FraudDecision>[] = [
  {
    value: "confirmed_fraud",
    label: "Fraude confirmado",
    description:
      "Se probó el fraude; exige código de motivo y suele ir con watchlist.",
  },
  {
    value: "false_positive",
    label: "Falso positivo",
    description:
      "La alerta saltó sin fraude real; el cliente vuelve a su curso normal.",
  },
  {
    value: "needs_more_investigation",
    label: "Necesita más investigación",
    description:
      "No hay prueba suficiente en ningún sentido; el caso sigue abierto.",
  },
  {
    value: "blocked",
    label: "Bloquear",
    description:
      "Corta la operación del cliente de inmediato; exige código de motivo.",
  },
  {
    value: "escalated",
    label: "Escalar",
    description:
      "Lo decide un nivel superior (cumplimiento o dirección de riesgo).",
  },
];

/**
 * Estados de la máquina de estados del cliente (`customer-lifecycle.constants.ts` en AtlasBackend).
 * Desde la corrección H1 el backend sólo acepta éstos: los nombres anteriores
 * («aprobado — siguiente paso», «pendiente de información»…) daban 400 al elegirlos.
 */
export const NEXT_STATUS_OPTIONS: TypedOption<NextCustomerStatus>[] = [
  {
    value: "active",
    label: "Habilitado",
    description:
      "El cliente queda habilitado y puede pedir crédito si la evaluación lo permite.",
  },
  {
    value: "observed",
    label: "Observado",
    description:
      "El cliente debe corregir o aportar algo en su alta antes de volver a revisión.",
  },
  {
    value: "under_review",
    label: "En revisión",
    description: "El cliente queda en revisión hasta que alguien decida.",
  },
  {
    value: "rejected",
    label: "Rechazado",
    description: "El cliente queda rechazado y no puede seguir con el alta.",
  },
  {
    value: "suspended",
    label: "Suspendido",
    description:
      "Un cliente habilitado deja de operar temporalmente hasta que se revise.",
  },
  {
    value: "blocked",
    label: "Bloqueado",
    description:
      "El cliente no puede operar; levantar el bloqueo obliga a volver a revisarlo.",
  },
];

/** La fila que deja el estado del cliente como está (el campo es opcional). */
export const NO_STATUS_CHANGE: Option = {
  value: "",
  label: "Sin cambio",
  description: "La decisión cierra el caso sin tocar el estado del cliente.",
};

/** Fraude decide sobre el acceso: bloquear, suspender, volver a revisión o dejar habilitado. */
export const FRAUD_NEXT_STATUS_VALUES: NextCustomerStatus[] = [
  "blocked",
  "suspended",
  "under_review",
  "active",
];

export const IDENTITY_DECISIONS: Option[] = [
  {
    value: "approve",
    label: "Aprobar identidad",
    description:
      "La cara y el carnet corresponden a la misma persona y el documento es válido.",
  },
  {
    value: "reject",
    label: "Rechazar identidad",
    description:
      "No corresponden o el documento no es válido; exige notas que lo justifiquen.",
  },
];

/** Estados y prioridades de caso que devuelve la cola: los que no estén aquí van sin descripción. */
export const WORK_QUEUE_STATUS_HELP: Record<string, string> = {
  open: "Abierto y sin analista: nadie lo ha tomado todavía.",
  in_review: "Un analista lo tiene tomado y está trabajando en él.",
  pending: "Espera algo externo (el cliente o otro equipo) para avanzar.",
  closed: "Ya tiene decisión registrada y no admite más acciones.",
};

export const WORK_QUEUE_PRIORITY_HELP: Record<string, string> = {
  low: "Puede esperar; se atiende después de todo lo demás.",
  medium: "Prioridad normal de la cola, por orden de llegada.",
  high: "Atender antes que los normales: afecta a un alta en curso.",
  critical: "Atender primero: riesgo de pérdida o de fraude activo.",
};
