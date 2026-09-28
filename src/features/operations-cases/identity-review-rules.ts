import { isAtlasApiError } from "@/shared/api/errors";

/**
 * Los casos de revisión de IDENTIDAD en la cola de operaciones.
 *
 * Desde el 2026-09-28 (`IDENTITY_REQUIRE_HUMAN_REVIEW`) la prueba de vida y el carnet los decide
 * una persona: el backend deja el intento `IN_REVIEW` y abre un caso `identity_review`
 * (`MR-ID-…`) en `manual_review_cases`. Ese caso se cierra DECIDIENDO LA IDENTIDAD en el panel del
 * expediente; el formulario de revisión de riesgo lo rechaza siempre con
 * `409 MANUAL_REVIEW_ES_DE_IDENTIDAD`. La cola ofrecía «Decidir» igual, que era un botón que no
 * podía salir bien.
 */
export const IDENTITY_REVIEW_CASE_TYPE = "identity_review";

export function isIdentityReviewCase(item: {
  reasonCode: string | null;
  caseCode: string | null;
}): boolean {
  return (
    item.reasonCode === IDENTITY_REVIEW_CASE_TYPE ||
    (item.caseCode ?? "").startsWith("MR-ID-")
  );
}

/** El expediente del cliente, abierto en el panel de identidad. */
export function identityCaseHref(customerId: string | null): string | null {
  if (!customerId) return null;
  return `/internal/operations/customers/${encodeURIComponent(customerId)}/investigation-summary#identidad`;
}

/** El tipo de caso en palabras (`reasonCode` de la cola = `case_type` del caso). */
const CASE_TYPE_LABELS: Record<string, string> = {
  identity_review: "Identidad",
  credit_application_review: "Solicitud de crédito",
  risk_assessment_review: "Evaluación de riesgo",
  onboarding_review: "Revisión del alta",
};

export function caseTypeLabel(code: string | null | undefined): string {
  if (!code) return "—";
  if (CASE_TYPE_LABELS[code]) return CASE_TYPE_LABELS[code];
  const texto = code.replaceAll("_", " ").toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** El código de motivo por defecto de cada decisión, para no auditar un rechazo como aprobación. */
export const DEFAULT_IDENTITY_REASON = {
  approve: "identity_verified",
  reject: "identity_rejected",
} as const;

/** Lo que falló al decidir la identidad, en palabras. */
export function identityDecisionErrorText(error: unknown): string {
  if (!isAtlasApiError(error)) return "Error inesperado.";
  if (/IDENTITY_VERIFICATION_ATTEMPT_NOT_FOUND/.test(error.message))
    return "Este cliente no tiene ningún intento de identidad esperando revisión: no hay nada que decidir.";
  if (error.status === 403) return "Tu rol no puede decidir identidades.";
  return error.message;
}

/** Por qué no se ve un documento. Antes cualquier fallo decía «ya no está en el almacén». */
export function documentContentErrorText(error: unknown): string {
  if (isAtlasApiError(error) && error.status === 404)
    return "El archivo ya no está en el almacén.";
  if (isAtlasApiError(error) && error.status === 403)
    return "Tu rol no puede ver los documentos.";
  return "No se pudo cargar el archivo.";
}

const RESULT_LABELS: Record<string, string> = {
  VERIFIED: "Verificada",
  REJECTED: "Rechazada",
  IN_REVIEW: "En revisión humana",
  PENDING: "Pendiente",
  UNAVAILABLE: "No disponible",
  ERROR: "Falló la verificación",
};

const CHANNEL_LABELS: Record<string, string> = {
  MOBILE_APP: "App del cliente",
  SEGIP: "SEGIP",
};

export function identityResultLabel(code: string | null): string {
  if (!code) return "—";
  return RESULT_LABELS[code.toUpperCase()] ?? caseTypeLabel(code);
}

export function identityChannelLabel(code: string | null): string {
  if (!code) return "—";
  return CHANNEL_LABELS[code.toUpperCase()] ?? caseTypeLabel(code);
}

/**
 * Lo que el Motor habría decidido cuando la política retuvo el intento. Es una SUGERENCIA: quien
 * decide es la persona, y el texto lo dice para que no se lea como veredicto.
 */
export function engineSuggestionText(
  suggestion: "VERIFIED" | "REJECTED" | null | undefined,
  reason: string | null | undefined,
): string | null {
  if (!suggestion) return null;
  const verbo = suggestion === "VERIFIED" ? "aprobar" : "rechazar";
  return `El Motor sugiere ${verbo}${reason ? ` (${caseTypeLabel(reason).toLowerCase()})` : ""}. Decide una persona.`;
}
