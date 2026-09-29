import { isAtlasApiError } from "@/shared/api/errors";
import type { CreditApplication } from "./types";

/**
 * Reglas de la solicitud que la pantalla necesita ANTES de ofrecer un botón.
 *
 * El backend las aplica igual (una pantalla se salta con curl); aquí se repiten para no ofrecer
 * un formulario que va a terminar en 409. Si divergen, manda el backend y el 409 se enseña.
 */

const CLOSED_STATUSES = ["approved", "rejected", "cancelled", "expired"];

/** Tipo de caso con el que el crédito abre su revisión propia en la cola (`CR-<código>`). */
export const CREDIT_REVIEW_CASE_TYPE = "credit_application_review";

/**
 * ¿La revisión de esta solicitud la lleva el Motor? Mismo criterio que `reviewBelongsToEngine`
 * en `credit-decision.service.ts`: manda la fuente del caso; sin ella (filas anteriores al
 * registro de la fuente), que la ejecutara el Motor en modo `decision_engine`.
 */
export function reviewBelongsToEngine(
  application: Pick<
    CreditApplication,
    "manualReviewCaseSource" | "decisionExecutionId" | "decisionMode"
  >,
): boolean {
  if (application.manualReviewCaseSource)
    return application.manualReviewCaseSource === "engine";
  return (
    Boolean(application.decisionExecutionId) &&
    application.decisionMode === "decision_engine"
  );
}

export function isClosedApplication(status: string): boolean {
  return CLOSED_STATUSES.includes(status);
}

export type DecisionAvailability =
  | { kind: "decide" }
  | { kind: "closed" }
  | { kind: "engine"; executionId: string | null };

/** Qué se puede hacer con la decisión humana de esta solicitud. */
export function decisionAvailability(
  application: CreditApplication,
): DecisionAvailability {
  if (isClosedApplication(application.status)) return { kind: "closed" };
  if (reviewBelongsToEngine(application))
    return { kind: "engine", executionId: application.decisionExecutionId };
  return { kind: "decide" };
}

/** La aceptación del negocio sólo cabe sobre lo que el motor aprobó y sigue esperando. */
export function acceptanceIsPending(application: CreditApplication): boolean {
  return application.businessAcceptance === "pending";
}

/** ¿Esta fila de la cola es el caso propio de una solicitud de crédito? */
export function isCreditReviewCase(item: {
  reasonCode: string | null;
  caseCode: string | null;
}): boolean {
  return (
    item.reasonCode === CREDIT_REVIEW_CASE_TYPE ||
    (item.caseCode ?? "").startsWith("CR-")
  );
}

/** `CR-<código de solicitud>` → `<código de solicitud>`; `null` si no tiene esa forma. */
export function applicationCodeFromCaseCode(
  caseCode: string | null,
): string | null {
  if (!caseCode?.startsWith("CR-")) return null;
  const code = caseCode.slice(3).trim();
  return code.length > 0 ? code : null;
}

/** El enlace desde la cola hasta la solicitud que resuelve el caso. */
export function creditCaseHref(item: {
  caseCode: string | null;
  customerId: string | null;
}): string | null {
  if (!item.customerId || !applicationCodeFromCaseCode(item.caseCode))
    return null;
  const query = new URLSearchParams({
    customerId: item.customerId,
    caseCode: item.caseCode ?? "",
  });
  return `/internal/operations/credit/applications/from-case?${query.toString()}`;
}

/*
 * Los conflictos de crédito llegan como `409 CONFLICT` con el código de negocio al principio del
 * mensaje (`CREDIT_…: detalle`). Se traducen a lo que el operador puede hacer; lo que no está aquí
 * se enseña tal cual, que un mensaje feo es mejor que uno escondido.
 */
const KNOWN_ERRORS: Array<[string, string]> = [
  [
    "CREDIT_APPLICATION_ALREADY_DECIDED",
    "Esta solicitud ya estaba resuelta: otra persona la decidió antes. Recarga para ver cómo quedó.",
  ],
  [
    "CREDIT_DECISION_DELEGADA_AL_MOTOR",
    "Esta solicitud la revisa el Motor de decisiones: se decide en su bandeja, no aquí.",
  ],
  [
    "CREDIT_BUSINESS_ACCEPTANCE_NOT_PENDING",
    "La aceptación del negocio ya no está pendiente: alguien la registró antes. Recarga la solicitud.",
  ],
  [
    "CREDIT_APPLICATION_NOT_FOUND",
    "No existe una solicitud con ese identificador en esta empresa.",
  ],
  [
    "CREDIT_PRODUCT_CODE_ALREADY_EXISTS",
    "Ya existe un producto con ese código. Elige otro código.",
  ],
  ["CREDIT_PRODUCT_NOT_FOUND", "Ese producto ya no existe en el catálogo."],
  [
    "CREDIT_PRODUCT_STATUS_TRANSITION_NOT_ALLOWED",
    "Ese cambio de estado no está permitido desde el estado actual del producto (un producto retirado no vuelve a ofrecerse). Recarga la lista.",
  ],
  [
    "DECISION_ENGINE_UNAVAILABLE",
    "El Motor de decisiones no respondió. La línea vigente no se tocó; vuelve a intentarlo en unos minutos.",
  ],
];

export function creditErrorMessage(error: unknown, fallback: string): string {
  if (!isAtlasApiError(error)) return fallback;
  const known = KNOWN_ERRORS.find(
    ([code]) => error.message.startsWith(code) || error.code === code,
  );
  if (known) return known[1];
  if (error.status === 403)
    return "Tu rol no puede hacer esta operación de crédito. Pídele acceso a un administrador.";
  return error.message || fallback;
}

/** Un 409 del producto duplicado va al campo del código, no a un aviso general. */
export function isDuplicatedProductCode(error: unknown): boolean {
  return (
    isAtlasApiError(error) &&
    error.message.startsWith("CREDIT_PRODUCT_CODE_ALREADY_EXISTS")
  );
}
