import { z } from "zod";
import type { Option } from "@/shared/lib/options";
import { PAYMENT_METHODS } from "./types";
import type {
  RegisterPaymentInput,
  ReversePaymentInput,
  WriteOffInput,
} from "./types";

/**
 * Los formularios de la cartera validan AQUÍ lo mismo que el esquema Zod del servidor
 * (`loans.schemas.ts`), para que quien opera vea el problema en el campo y no un 400 opaco.
 * El servidor sigue siendo quien decide: lo que no se puede saber desde aquí —si el importe
 * supera lo pendiente, si la moneda coincide— llega como rechazo y se explica en el formulario.
 */

/** Hasta dos decimales, sin signo, mayor que cero: la regla exacta de `decimalAmount`. */
const IMPORTE = /^(0|[1-9][0-9]{0,15})(\.[0-9]{1,2})?$/;

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(IMPORTE, "Importe con hasta dos decimales, sin signo. Ej.: 350.50")
    .refine((value) => Number.parseFloat(value) > 0, {
      message: "El importe debe ser mayor que cero.",
    }),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "Elige cómo pagó el cliente.",
  }),
  externalReference: z.string().trim().max(160, "Como mucho 160 caracteres."),
});

export type PaymentForm = z.infer<typeof paymentFormSchema>;

export const paymentFormDefaults: PaymentForm = {
  amount: "",
  paymentMethod: "bank_transfer",
  externalReference: "",
};

/** La moneda NO se elige: es la del préstamo. Elegirla sólo abría la puerta a `CURRENCY_MISMATCH`. */
export function toPaymentInput(
  values: PaymentForm,
  currencyCode: string,
): RegisterPaymentInput {
  const externalReference = values.externalReference.trim();
  return {
    amount: values.amount.trim(),
    currencyCode,
    paymentMethod: values.paymentMethod,
    ...(externalReference ? { externalReference } : {}),
  };
}

const motivo = z
  .string()
  .trim()
  .min(1, "Elige el motivo: queda en el historial del préstamo.")
  .max(120);

export const reversalFormSchema = z.object({
  reasonCode: motivo,
  notes: z.string().trim().max(2000, "Como mucho 2000 caracteres."),
});

export type ReversalForm = z.infer<typeof reversalFormSchema>;

export function toReversalInput(values: ReversalForm): ReversePaymentInput {
  const notes = values.notes.trim();
  return { reasonCode: values.reasonCode, ...(notes ? { notes } : {}) };
}

/** El castigo exige motivo Y explicación: el servidor rechaza las notas vacías. */
export const writeOffFormSchema = z.object({
  reasonCode: motivo,
  notes: z
    .string()
    .trim()
    .min(1, "Explica qué gestión de cobro se hizo antes de castigar.")
    .max(2000, "Como mucho 2000 caracteres."),
});

export type WriteOffForm = z.infer<typeof writeOffFormSchema>;

export function toWriteOffInput(values: WriteOffForm): WriteOffInput {
  return { reasonCode: values.reasonCode, notes: values.notes.trim() };
}

/**
 * Motivos sugeridos. El servidor acepta cualquier código corto (no hay catálogo cerrado), así que
 * estos son los que ya usan sus pruebas (`chargeback`, `incobrable`) más los casos que el equipo
 * de cobranza nombra a diario. Un código nuevo se añade aquí, con su significado.
 */
export const REVERSAL_REASON_OPTIONS: Option[] = [
  {
    value: "chargeback",
    label: "Contracargo",
    description: "El banco o la tarjeta devolvió el dinero al cliente.",
  },
  {
    value: "duplicate_payment",
    label: "Cobro duplicado",
    description: "El mismo pago se registró dos veces por error.",
  },
  {
    value: "wrong_loan",
    label: "Préstamo equivocado",
    description:
      "El cobro era de otro préstamo; se reversa aquí y se registra allí.",
  },
  {
    value: "amount_error",
    label: "Importe mal registrado",
    description:
      "Se tecleó otro importe; se reversa y se vuelve a registrar bien.",
  },
  {
    value: "funds_not_received",
    label: "Fondos no recibidos",
    description: "Se anotó un pago que nunca llegó a la cuenta de Atlas.",
  },
];

export const WRITE_OFF_REASON_OPTIONS: Option[] = [
  {
    value: "incobrable",
    label: "Incobrable",
    description: "Se agotó la gestión de cobranza sin recuperar la deuda.",
  },
  {
    value: "deceased",
    label: "Fallecimiento del titular",
    description: "El titular falleció y no hay a quién reclamar la deuda.",
  },
  {
    value: "fraud",
    label: "Fraude confirmado",
    description: "El crédito se originó con identidad o datos falsos.",
  },
  {
    value: "insolvency",
    label: "Insolvencia declarada",
    description: "El titular está en concurso o quiebra declarada por un juez.",
  },
];

/** Por qué una deuda o un cliente tiene la categoría que tiene (`ratingReason` del backend). */
const RATING_REASON_LABELS: Record<string, string> = {
  days_past_due: "Días de atraso",
  written_off: "Castigado",
  worst_operation: "La peor de sus operaciones",
  no_open_debt: "Sin deuda viva",
};

/**
 * Un motivo de la cartera en palabras: reverso, castigo o calificación. Se pintaban los códigos
 * (`chargeback`, `worst_operation`) aunque los formularios ya tenían sus etiquetas.
 */
export function motivoDeCartera(code: string | null | undefined): string {
  if (!code) return "—";
  const opcion = [...REVERSAL_REASON_OPTIONS, ...WRITE_OFF_REASON_OPTIONS].find(
    (option) => option.value === code,
  );
  if (opcion) return opcion.label;
  if (RATING_REASON_LABELS[code]) return RATING_REASON_LABELS[code];
  const texto = code.replaceAll("_", " ").toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
