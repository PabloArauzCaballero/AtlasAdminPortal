import { z } from "zod";
import type { FraudDecisionInput, ManualReviewDecisionInput } from "./types";

const NEXT_STATUS = [
  "approved_for_next_step",
  "rejected",
  "pending_more_information",
  "pending_fraud_review",
  "registered",
  "blocked",
] as const;

/** `""` = "sin cambio" en el `<Select>`; se traduce a `undefined` en el payload. */
const nextStatusField = z.enum(["", ...NEXT_STATUS]);

/**
 * Decisión de revisión manual. El backend EXIGE notas al rechazar o pedir más
 * información: la regla cruzada se valida acá para que el operador lo vea en el
 * formulario y no como un 400 opaco. Cada decisión de caso queda en auditoría,
 * así que el motivo siempre es obligatorio.
 */
export const manualReviewSchema = z
  .object({
    decision: z.enum([
      "approved",
      "rejected",
      "request_more_information",
      "escalated_to_fraud",
      "no_action",
    ]),
    reasonCode: z.string().trim().min(1, "El código de motivo es obligatorio."),
    notes: z.string().trim(),
    nextCustomerStatus: nextStatusField,
  })
  .superRefine((value, ctx) => {
    const notesRequired =
      value.decision === "rejected" ||
      value.decision === "request_more_information";
    if (notesRequired && value.notes.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["notes"],
        message:
          "Obligatorio al rechazar o pedir más información: el backend lo exige.",
      });
    }
  });

export type ManualReviewForm = z.infer<typeof manualReviewSchema>;

export const manualReviewDefaults: ManualReviewForm = {
  decision: "approved",
  reasonCode: "",
  notes: "",
  nextCustomerStatus: "",
};

export function toManualReviewInput(
  values: ManualReviewForm,
): ManualReviewDecisionInput {
  return {
    decision: values.decision,
    reasonCode: values.reasonCode.trim(),
    notes: values.notes.trim() || undefined,
    nextCustomerStatus: values.nextCustomerStatus || undefined,
  };
}

/**
 * Decisión de fraude. Aquí la regla cruzada es el MOTIVO: obligatorio al
 * confirmar fraude o bloquear (acciones con impacto directo sobre el cliente),
 * opcional en el resto. Las notas siempre son opcionales.
 */
export const fraudSchema = z
  .object({
    decision: z.enum([
      "confirmed_fraud",
      "false_positive",
      "needs_more_investigation",
      "blocked",
      "escalated",
    ]),
    reasonCode: z.string().trim(),
    applyWatchlist: z.boolean(),
    notes: z.string().trim(),
    nextCustomerStatus: nextStatusField,
  })
  .superRefine((value, ctx) => {
    const reasonRequired =
      value.decision === "confirmed_fraud" || value.decision === "blocked";
    if (reasonRequired && value.reasonCode.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "Obligatorio para fraude confirmado o bloqueo.",
      });
    }
  });

export type FraudForm = z.infer<typeof fraudSchema>;

export const fraudDefaults: FraudForm = {
  decision: "needs_more_investigation",
  reasonCode: "",
  applyWatchlist: false,
  notes: "",
  nextCustomerStatus: "",
};

export function toFraudInput(values: FraudForm): FraudDecisionInput {
  return {
    decision: values.decision,
    reasonCode: values.reasonCode.trim() || undefined,
    applyWatchlist: values.applyWatchlist,
    notes: values.notes.trim() || undefined,
    nextCustomerStatus: values.nextCustomerStatus || undefined,
  };
}
