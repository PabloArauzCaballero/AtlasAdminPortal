import { isAtlasApiError } from "@/shared/api/errors";

/**
 * Los códigos del expediente de comercio, en palabras de quien lo atiende.
 *
 * El backend publica `under_review`, `APROBADO`, `pending_review`… y la pantalla los pintaba tal
 * cual: «Estado: under_review», «está en «approved»». Aquí se traducen UNA vez. Un código que no
 * esté en el mapa se enseña como «Otro estado» con el código entre paréntesis, para que un valor
 * nuevo del backend no desaparezca en silencio pero tampoco se lea como si fuera una palabra.
 */

/** `partner_profiles.onboarding_status`: draft → contact_verified → documents_submitted → under_review → approved | rejected. */
export const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  contact_verified: "Contacto verificado",
  documents_submitted: "Documentos enviados",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

/** El veredicto del Motor (o de la decisión manual), `decision.outcome`. */
export const DECISION_OUTCOME_LABELS: Record<string, string> = {
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  REVISION_MANUAL: "Revisión manual",
};

/** Motivos conocidos del veredicto. Los del Motor que no estén aquí se enseñan tal cual, como dato. */
export const DECISION_REASON_LABELS: Record<string, string> = {
  DECISION_MANUAL_PORTAL: "Decisión manual desde este portal",
};

/** `partner_qr_codes.status`. */
export const QR_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pendiente de revisión",
  active: "Activo",
  rejected: "Rechazado",
  replaced: "Reemplazado",
  archived: "Archivado",
};

export const QR_KIND_LABELS: Record<string, string> = {
  bank: "QR bancario (cobro)",
  business: "QR del negocio",
};

/** Sucursales y terminales comparten vocabulario: `registered`, `active`, `suspended`, `retired`. */
export const NETWORK_STATUS_LABELS: Record<string, string> = {
  registered: "Registrado",
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
  retired: "Retirado",
};

function etiqueta(
  mapa: Record<string, string>,
  valor: string | null | undefined,
): string {
  if (!valor) return "Sin estado";
  return mapa[valor] ?? `Otro estado (${valor})`;
}

export const onboardingStatusLabel = (valor: string | null | undefined) =>
  etiqueta(ONBOARDING_STATUS_LABELS, valor);
export const decisionOutcomeLabel = (valor: string | null | undefined) =>
  etiqueta(DECISION_OUTCOME_LABELS, valor);
export const qrStatusLabel = (valor: string | null | undefined) =>
  etiqueta(QR_STATUS_LABELS, valor);
export const networkStatusLabel = (valor: string | null | undefined) =>
  etiqueta(NETWORK_STATUS_LABELS, valor);
export const qrKindLabel = (valor: string | null | undefined) =>
  (valor && QR_KIND_LABELS[valor]) || "QR";
export const decisionReasonLabel = (valor: string) =>
  DECISION_REASON_LABELS[valor] ?? valor;

/**
 * Por qué no se registró una acción sobre el expediente, dicho para quien la intentó.
 *
 * Los 409 y el 503 del backend traen el código delante del mensaje
 * («PARTNER_DECISION_DELEGADA_AL_MOTOR: el caso…»). Los conocidos se reescriben con lo que hay que
 * hacer; cualquier otro error de la API se enseña con su mensaje, y lo que ni siquiera es un error
 * de la API (red caída) con el texto de respaldo de cada acción.
 */
export function partnerActionErrorMessage(
  error: unknown,
  respaldo: string,
): string {
  if (!isAtlasApiError(error)) return respaldo;
  const texto = `${error.code} ${error.message}`;
  if (texto.includes("PARTNER_DECISION_DELEGADA_AL_MOTOR")) {
    return "Este expediente tiene un caso abierto en el Motor y se decide allí, no aquí.";
  }
  if (texto.includes("PARTNER_NOT_UNDER_REVIEW")) {
    return "Este expediente ya no está en revisión: alguien lo decidió o cambió mientras lo mirabas. Cierra y vuelve a abrirlo para ver cómo quedó.";
  }
  if (texto.includes("QR_NOT_PENDING_REVIEW")) {
    return "Este QR ya no está pendiente: alguien lo revisó mientras lo mirabas.";
  }
  if (error.status === 503 || texto.includes("DECISION_ENGINE_UNAVAILABLE")) {
    return "El Motor no respondió. El expediente quedó como estaba; vuelve a intentarlo en unos minutos.";
  }
  if (error.status === 403) {
    return "Tu usuario no tiene permiso para esta acción.";
  }
  return error.message || respaldo;
}
