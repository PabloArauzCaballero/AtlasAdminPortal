import type { Option } from "@/shared/lib/options";

/** Qué significa cada estado del aviso, en palabras de quien opera. */
export const PAYMENT_CLAIM_STATUS_OPTIONS: Option[] = [
  {
    value: "pending_verification",
    label: "Por verificar",
    description:
      "El cliente avisó que pagó y el comercio todavía no confirmó si el dinero llegó a su cuenta.",
  },
  {
    value: "verified",
    label: "Verificado",
    description:
      "El comercio confirmó el dinero: el pago quedó registrado en la cuota del préstamo.",
  },
  {
    value: "rejected",
    label: "Rechazado",
    description:
      "El comercio no encontró el dinero o el comprobante no cuadraba; el motivo va en la fila.",
  },
];

/** Antigüedad mínima del aviso: la pregunta de supervisión es «¿qué lleva demasiado esperando?». */
export const PAYMENT_CLAIM_AGE_OPTIONS: Option[] = [
  {
    value: "24",
    label: "Más de 24 h",
    description:
      "Avisos enviados hace más de un día, estén pendientes o ya decididos.",
  },
  {
    value: "48",
    label: "Más de 48 h",
    description:
      "El plazo a partir del cual un aviso pendiente se considera atrasado.",
  },
  {
    value: "168",
    label: "Más de 7 días",
    description:
      "Avisos de hace más de una semana: si siguen pendientes, el cliente lleva días sin respuesta.",
  },
];

export function paymentClaimStatusLabel(status: string): string {
  return (
    PAYMENT_CLAIM_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

/** «3 h», «2 d 4 h»: la edad del aviso en la unidad que se lee de un vistazo. */
export function formatAgeHours(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
}
