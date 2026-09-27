import type { Option } from "@/shared/lib/options";
import type { CreditDecision, CreditProductStatus } from "./types";

type TypedOption<T extends string> = Option & { value: T };

/** Los cuatro estados del producto (CHECK de `credit_products.status`). */
export const PRODUCT_STATUS_OPTIONS: TypedOption<CreditProductStatus>[] = [
  {
    value: "draft",
    label: "Borrador",
    description:
      "Recién creado y todavía invisible para los clientes; nadie puede solicitarlo.",
  },
  {
    value: "active",
    label: "Activo",
    description:
      "Se ofrece a los clientes habilitados dentro de sus fechas de vigencia.",
  },
  {
    value: "suspended",
    label: "Suspendido",
    description:
      "Deja de ofrecerse por ahora; las solicitudes ya enviadas siguen su curso.",
  },
  {
    value: "retired",
    label: "Retirado",
    description:
      "Fuera del catálogo de forma definitiva; se conserva para el historial.",
  },
];

export function productStatusLabel(value: string): string {
  return (
    PRODUCT_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export const PRODUCT_STATUS_REASONS: Option[] = [
  {
    value: "commercial_launch",
    label: "Lanzamiento comercial",
    description:
      "El negocio aprobó ofrecer el producto con estas condiciones desde hoy.",
  },
  {
    value: "terms_review",
    label: "Revisión de condiciones",
    description:
      "Se pausa mientras se revisan tasa, montos o plazos del producto.",
  },
  {
    value: "regulatory_requirement",
    label: "Exigencia regulatoria",
    description:
      "Un cambio normativo obliga a dejar de ofrecerlo o a ajustarlo antes.",
  },
  {
    value: "risk_appetite_change",
    label: "Cambio de apetito de riesgo",
    description:
      "La política de riesgo ya no sostiene el producto en su forma actual.",
  },
  {
    value: "replaced_by_new_product",
    label: "Reemplazado por otro producto",
    description:
      "Un producto nuevo cubre el mismo uso; éste deja de ofrecerse.",
  },
];

export const DECISION_OPTIONS: TypedOption<CreditDecision>[] = [
  {
    value: "approve",
    label: "Aprobar",
    description:
      "El cliente puede seguir al desembolso; la nota es opcional pero recomendable.",
  },
  {
    value: "reject",
    label: "Rechazar",
    description:
      "Cierra la solicitud sin crédito; exige una nota que lo justifique.",
  },
  {
    value: "request_more_information",
    label: "Pedir más información",
    description:
      "La solicitud sigue abierta en revisión; exige una nota con lo que falta.",
  },
];

export const DECISION_REASONS: Option[] = [
  {
    value: "manual_review_complete",
    label: "Revisión completa",
    description:
      "Se revisó el expediente completo y respalda la decisión tomada.",
  },
  {
    value: "insufficient_payment_capacity",
    label: "Capacidad de pago insuficiente",
    description:
      "La cuota pedida no cabe en el ingreso disponible que muestra el expediente.",
  },
  {
    value: "incomplete_documentation",
    label: "Documentación incompleta",
    description:
      "Falta el extracto u otro documento necesario para decidir con datos.",
  },
  {
    value: "policy_exception",
    label: "Excepción a la política",
    description:
      "Se aparta de la política vigente; la nota debe explicar por qué.",
  },
  {
    value: "fraud_suspicion",
    label: "Sospecha de fraude",
    description:
      "Hay señales de suplantación o abuso; conviene abrir también un caso de fraude.",
  },
];

export const ACCEPTANCE_OPTIONS: Option[] = [
  {
    value: "accept",
    label: "Aceptar la operación",
    description:
      "El negocio quiere esta venta: el cliente queda habilitado para seguir y pagar el inicial.",
  },
  {
    value: "decline",
    label: "Declinar la operación",
    description:
      "El negocio no la quiere aunque el motor la aprobara; exige motivo y la solicitud queda rechazada.",
  },
];

export const ACCEPTANCE_REASONS: Option[] = [
  {
    value: "merchant_unavailable",
    label: "Comercio no disponible",
    description:
      "El comercio no puede entregar el bien o servicio en este momento.",
  },
  {
    value: "commercial_policy",
    label: "Política comercial",
    description:
      "La operación no encaja con lo que el negocio quiere financiar hoy.",
  },
  {
    value: "customer_withdrew",
    label: "El cliente desistió",
    description:
      "El cliente avisó que ya no quiere la compra antes de confirmarla.",
  },
  {
    value: "suspected_irregularity",
    label: "Irregularidad sospechada",
    description:
      "Algo de la operación no cuadra; se declina mientras se investiga.",
  },
];

/** Estados de la solicitud, en palabras de operación. */
export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  submitted: "Enviada",
  under_review: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  expired: "Vencida",
};

export const ACCEPTANCE_LABELS: Record<string, string> = {
  pending: "Esperando al negocio",
  accepted: "Aceptada por el negocio",
  declined: "Declinada por el negocio",
};

export const DECISION_MODE_LABELS: Record<string, string> = {
  decision_engine: "Motor de decisiones",
  manual: "Decisión humana",
  engine_unavailable_manual: "Humana (motor no disponible)",
  seed_demo: "Dato de demostración",
};

export function labelOr(map: Record<string, string>, value?: string | null) {
  if (!value) return "—";
  return map[value] ?? value;
}
