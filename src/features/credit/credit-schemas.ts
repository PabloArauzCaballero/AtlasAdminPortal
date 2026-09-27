import { z } from "zod";
import type { CreateCreditProductBody } from "./types";

/*
 * Espejo de `credit.schemas.ts` de AtlasBackend. Los límites son los mismos para que el error salga
 * en el campo, antes de enviar, y no como un 400 genérico después.
 */

const MAX_AMOUNT = 99_999_999;

/** Texto de un campo numérico: vacío se permite sólo donde el backend lo admite opcional. */
function numeric(
  message: string,
  check: (value: number) => boolean,
  optional = false,
) {
  return z
    .string()
    .trim()
    .refine(
      (raw) =>
        (optional && raw === "") ||
        (raw !== "" && Number.isFinite(Number(raw)) && check(Number(raw))),
      message,
    );
}

const amount = numeric(
  `Un importe mayor que 0 y hasta ${MAX_AMOUNT.toLocaleString("es-BO")}.`,
  (value) => value > 0 && value <= MAX_AMOUNT,
);
const months = numeric(
  "Meses enteros, entre 1 y 360.",
  (value) => Number.isInteger(value) && value >= 1 && value <= 360,
);

export const productFormSchema = z
  .object({
    productCode: z
      .string()
      .trim()
      .min(2, "Al menos 2 caracteres.")
      .max(60, "Como mucho 60 caracteres.")
      .regex(/^[a-z0-9_-]+$/, "Sólo minúsculas, dígitos, guion y guion bajo."),
    productName: z
      .string()
      .trim()
      .min(3, "Al menos 3 caracteres.")
      .max(180, "Como mucho 180 caracteres."),
    description: z.string().trim().max(2000, "Como mucho 2000 caracteres."),
    currencyCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Código ISO de 3 letras, p. ej. BOB."),
    minAmount: amount,
    maxAmount: amount,
    minTermMonths: months,
    maxTermMonths: months,
    annualInterestRate: numeric(
      "Un porcentaje entre 0 y 999, o vacío.",
      (value) => value >= 0 && value <= 999,
      true,
    ),
    minMonthlyIncome: numeric(
      "Un importe desde 0, o vacío.",
      (value) => value >= 0 && value <= MAX_AMOUNT,
      true,
    ),
    requiresManualReview: z.enum(["yes", "no"]),
    effectiveFrom: z.string(),
    effectiveUntil: z.string(),
  })
  .refine((value) => Number(value.maxAmount) >= Number(value.minAmount), {
    message: "El máximo no puede ser menor que el mínimo.",
    path: ["maxAmount"],
  })
  .refine(
    (value) => Number(value.maxTermMonths) >= Number(value.minTermMonths),
    {
      message: "El plazo máximo no puede ser menor que el mínimo.",
      path: ["maxTermMonths"],
    },
  )
  .refine(
    (value) =>
      !value.effectiveFrom ||
      !value.effectiveUntil ||
      value.effectiveUntil > value.effectiveFrom,
    {
      message: "El fin de vigencia debe ser posterior al inicio.",
      path: ["effectiveUntil"],
    },
  );

export type ProductForm = z.infer<typeof productFormSchema>;

export const productFormDefaults: ProductForm = {
  productCode: "",
  productName: "",
  description: "",
  currencyCode: "BOB",
  minAmount: "",
  maxAmount: "",
  minTermMonths: "",
  maxTermMonths: "",
  annualInterestRate: "",
  minMonthlyIncome: "",
  requiresManualReview: "no",
  effectiveFrom: "",
  effectiveUntil: "",
};

/** Una fecha `AAAA-MM-DD` del selector, como instante ISO al inicio de ese día (UTC). */
function dayToIso(day: string): string | undefined {
  return day ? new Date(`${day}T00:00:00.000Z`).toISOString() : undefined;
}

/** Del formulario (todo texto) al cuerpo que acepta el backend: números, opcionales fuera. */
export function toCreateProductBody(
  form: ProductForm,
): CreateCreditProductBody {
  const body: CreateCreditProductBody = {
    productCode: form.productCode.trim(),
    productName: form.productName.trim(),
    currencyCode: form.currencyCode.trim().toUpperCase(),
    minAmount: Number(form.minAmount),
    maxAmount: Number(form.maxAmount),
    minTermMonths: Number(form.minTermMonths),
    maxTermMonths: Number(form.maxTermMonths),
    requiresManualReview: form.requiresManualReview === "yes",
  };
  if (form.description.trim()) body.description = form.description.trim();
  if (form.annualInterestRate.trim())
    body.annualInterestRate = Number(form.annualInterestRate);
  if (form.minMonthlyIncome.trim())
    body.minMonthlyIncome = Number(form.minMonthlyIncome);
  const from = dayToIso(form.effectiveFrom);
  const until = dayToIso(form.effectiveUntil);
  if (from) body.effectiveFrom = from;
  if (until) body.effectiveUntil = until;
  return body;
}

export const productStatusSchema = z.object({
  status: z.enum(["draft", "active", "suspended", "retired"]),
  reasonCode: z.string().trim().min(1, "Elige el motivo del cambio."),
});

export type ProductStatusForm = z.infer<typeof productStatusSchema>;

export const decisionFormSchema = z
  .object({
    decision: z.enum(["approve", "reject", "request_more_information"]),
    reasonCode: z.string().trim().min(1, "Elige el motivo de la decisión."),
    notes: z.string().trim().max(2000, "Como mucho 2000 caracteres."),
  })
  .refine((value) => value.decision === "approve" || value.notes.length > 0, {
    message: "Rechazar o pedir más información exige una nota.",
    path: ["notes"],
  });

export type DecisionForm = z.infer<typeof decisionFormSchema>;

export const acceptanceFormSchema = z
  .object({
    choice: z.enum(["accept", "decline"]),
    reasonCode: z.string().trim().max(120),
    notes: z.string().trim().max(2000, "Como mucho 2000 caracteres."),
  })
  .refine((value) => value.choice === "accept" || value.reasonCode.length > 0, {
    message: "Declinar una operación aprobada exige un motivo.",
    path: ["reasonCode"],
  });

export type AcceptanceForm = z.infer<typeof acceptanceFormSchema>;

/** Sin campos vacíos: el backend es `.strict()` con opcionales, no con cadenas en blanco. */
export function withoutBlank<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => !(typeof entry === "string" && entry.trim() === ""),
    ),
  ) as Partial<T>;
}
