import { isAtlasApiError } from "@/shared/api/errors";
import type { Option } from "@/shared/lib/options";
import type { CreditApplicationSummary, PaymentMethod } from "./types";

type Tone = "default" | "success" | "warning" | "critical" | "info" | "muted";

/**
 * Los estados del libro llegan en el código de la base (`paid_off`, `partially_paid`). Quien
 * opera la cartera no tiene por qué saber inglés de columnas: aquí se traducen, con su tono.
 * Un código que no esté en el mapa se enseña tal cual y en gris, nunca se inventa un nombre.
 */
const ESTADOS: Record<string, { label: string; tone: Tone }> = {
  // Préstamo
  pending_disbursement: { label: "Por desembolsar", tone: "info" },
  active: { label: "Vigente", tone: "success" },
  paid_off: { label: "Pagado", tone: "muted" },
  written_off: { label: "Castigado", tone: "critical" },
  cancelled: { label: "Anulado", tone: "muted" },
  // Cuota
  pending: { label: "Pendiente", tone: "default" },
  partially_paid: { label: "Pago parcial", tone: "warning" },
  paid: { label: "Pagada", tone: "success" },
  overdue: { label: "Vencida", tone: "critical" },
  // Cobro
  applied: { label: "Aplicado", tone: "success" },
  reversed: { label: "Reversado", tone: "muted" },
  // Solicitud
  submitted: { label: "Enviada", tone: "default" },
  under_review: { label: "En revisión", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Rechazada", tone: "critical" },
  expired: { label: "Vencida", tone: "muted" },
};

export function estadoCartera(value: string | null | undefined): {
  label: string;
  tone: Tone;
} {
  if (!value) return { label: "—", tone: "muted" };
  return ESTADOS[value] ?? { label: value, tone: "default" };
}

const ACEPTACION: Record<string, string> = {
  pending: "El comercio aún no respondió",
  accepted: "Aceptada por el comercio",
  declined: "Rechazada por el comercio",
};

export function aceptacionDelComercio(value: string | null): string {
  if (value === null) return "No aplica";
  return ACEPTACION[value] ?? value;
}

/**
 * La misma regla que aplica el servidor antes de desembolsar (`assertDisbursable`): aprobada y
 * con el comercio sin respuesta pendiente ni negativa. Se replica sólo para decidir si se OFRECE
 * el botón; quien decide sigue siendo el servidor, que además revalida vigencia, consentimiento y
 * cupo en el momento.
 */
export function motivoParaNoDesembolsar(
  solicitud: Pick<CreditApplicationSummary, "status" | "businessAcceptance">,
): string | null {
  if (solicitud.status !== "approved")
    return "Sólo se desembolsa una solicitud aprobada.";
  if (solicitud.businessAcceptance === "pending")
    return "El comercio todavía no aceptó la venta.";
  if (solicitud.businessAcceptance === "declined")
    return "El comercio rechazó la venta.";
  return null;
}

export const PAYMENT_METHOD_OPTIONS: (Option & { value: PaymentMethod })[] = [
  {
    value: "cash",
    label: "Efectivo",
    description: "El cliente pagó en ventanilla o a un cobrador, en billetes.",
  },
  {
    value: "bank_transfer",
    label: "Transferencia bancaria",
    description:
      "Llegó a la cuenta de Atlas por transferencia; anota su número.",
  },
  {
    value: "qr",
    label: "Pago con QR",
    description: "Pagó escaneando un QR de cobro desde su banca móvil.",
  },
  {
    value: "card",
    label: "Tarjeta",
    description: "Cobro con tarjeta de débito o crédito en un terminal.",
  },
  {
    value: "wallet",
    label: "Billetera móvil",
    description: "Pagó desde una billetera electrónica, no desde su banco.",
  },
  {
    value: "direct_debit",
    label: "Débito automático",
    description: "Se debitó de su cuenta por una orden que él autorizó antes.",
  },
  {
    value: "other",
    label: "Otro medio",
    description: "Cualquier otro canal; explícalo en la referencia externa.",
  },
];

export function medioDePago(value: string): string {
  return PAYMENT_METHOD_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Qué significa cada rechazo del servidor para quien opera. El servidor manda un código estable
 * (`LOAN_ALREADY_DISBURSED`); se busca en el código y en el mensaje porque según la capa que lo
 * lance viaja en uno o en otro.
 */
const MOTIVOS: Record<string, string> = {
  CREDIT_APPLICATION_NOT_FOUND: "La solicitud no existe en este inquilino.",
  CREDIT_APPLICATION_NOT_APPROVED:
    "La solicitud ya no está aprobada; no se puede desembolsar.",
  CREDIT_BUSINESS_ACCEPTANCE_PENDING:
    "El comercio todavía no aceptó la venta: no se desembolsa hasta que responda.",
  CREDIT_BUSINESS_ACCEPTANCE_DECLINED:
    "El comercio rechazó la venta: esta solicitud no origina préstamo.",
  CREDIT_DECISION_EXPIRED:
    "La aprobación caducó: se tomó con otra deuda y otra línea. Hay que volver a decidirla.",
  LOAN_ALREADY_DISBURSED:
    "Esta solicitud ya tiene un préstamo desembolsado. Búscalo en la lista de préstamos del cliente.",
  LOAN_NOT_FOUND: "El préstamo no existe en este inquilino.",
  LOAN_NOT_COLLECTABLE:
    "El préstamo no está vigente: no admite cobros (pagado, castigado o anulado).",
  CURRENCY_MISMATCH: "La moneda del cobro no es la del préstamo.",
  PAYMENT_EXCEEDS_OUTSTANDING:
    "El importe supera lo pendiente. Adelantar cuotas no está permitido: registra como máximo lo que se debe.",
  LOAN_PAYMENT_NOT_FOUND: "Ese cobro no pertenece a este préstamo.",
  LOAN_PAYMENT_ALREADY_REVERSED: "Ese cobro ya estaba reversado.",
  LOAN_ALREADY_WRITTEN_OFF: "El préstamo ya estaba castigado.",
  LOAN_NOT_WRITE_OFF_ELIGIBLE:
    "Sólo se castiga un préstamo vigente; éste está pagado o anulado.",
};

export function explicarErrorDeCartera(error: unknown, generico: string) {
  if (!isAtlasApiError(error)) return generico;
  const clave = Object.keys(MOTIVOS).find(
    (codigo) => error.code === codigo || error.message.includes(codigo),
  );
  if (clave) return MOTIVOS[clave];
  if (error.status === 403)
    return "Tu rol no permite esta operación sobre la cartera.";
  return error.message || generico;
}

/** Filtro de estado de la cartera: los cinco que acepta `GET /operations/loans`. */
export const LOAN_STATUS_OPTIONS: Option[] = [
  {
    value: "active",
    label: "Vigente",
    description:
      "Desembolsado y con saldo por cobrar; admite cobros y castigo.",
  },
  {
    value: "pending_disbursement",
    label: "Por desembolsar",
    description: "Creado pero el dinero todavía no salió hacia el cliente.",
  },
  {
    value: "paid_off",
    label: "Pagado",
    description: "El cliente pagó todas las cuotas; ya no debe nada.",
  },
  {
    value: "written_off",
    label: "Castigado",
    description: "Se reconoció como pérdida; ya no admite cobros.",
  },
  {
    value: "cancelled",
    label: "Anulado",
    description: "Se dio de baja antes de producir deuda.",
  },
];

/** Tramos de mora del backend (`bucketForDaysPastDue`), de menor a mayor atraso. */
export const DELINQUENCY_BUCKET_OPTIONS: Option[] = [
  {
    value: "current",
    label: "Al día",
    description:
      "Ninguna cuota vencida sin pagar a la fecha del último barrido.",
  },
  {
    value: "dpd_1_29",
    label: "1 a 29 días",
    description: "Atraso temprano: suele resolverse con un recordatorio.",
  },
  {
    value: "dpd_30_59",
    label: "30 a 59 días",
    description: "Atraso que ya pesa en la calificación y pide gestión activa.",
  },
  {
    value: "dpd_60_89",
    label: "60 a 89 días",
    description: "Atraso serio: cobranza intensiva antes de llegar a 90.",
  },
  {
    value: "dpd_90_plus",
    label: "90 días o más",
    description:
      "Deuda deteriorada; candidata a castigo si la gestión se agota.",
  },
];

export function tramoDeMora(value: string | null | undefined): string {
  if (!value) return "—";
  return (
    DELINQUENCY_BUCKET_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}
