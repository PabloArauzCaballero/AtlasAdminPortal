import { isAtlasApiError } from "@/shared/api/errors";
import type { AvailableArtifact, DecisionArtifactBinding } from "./types";

/**
 * Si el artefacto que decide una cosa EXISTE en el Motor.
 *
 * La tabla decía «Heredado del entorno» junto a un código y parecía configurado. En TEST, el
 * 2026-09-28, crédito apuntaba a `ATLAS_BNPL_UNDERWRITING` y riesgo a `RIESGO_ONBOARDING_CLIENTE`,
 * y el Motor sólo publicaba `IDENTIDAD_CARNET_MOVIL`: cada evaluación de riesgo moría con
 * `ACTIVE_DEPLOYMENT_NOT_FOUND` y la pantalla no lo decía. Esto contrasta el código con el
 * catálogo que el propio Motor devuelve.
 *
 * - `published`: el Motor lo lista.
 * - `missing`: el Motor contestó con su catálogo y el código NO está: esa decisión va a fallar.
 * - `unknown`: el catálogo llegó vacío (Motor caído, sin credenciales o sin nada publicado). No se
 *   afirma ni que exista ni que falte: sin medir no hay veredicto.
 * - `unset`: no hay artefacto asignado.
 */
export type EnginePresence = "published" | "missing" | "unknown" | "unset";

export function enginePresence(
  binding: Pick<DecisionArtifactBinding, "artifactCode">,
  available: readonly AvailableArtifact[],
): EnginePresence {
  if (!binding.artifactCode) return "unset";
  if (available.length === 0) return "unknown";
  return available.some((item) => item.code === binding.artifactCode)
    ? "published"
    : "missing";
}

export const ENGINE_PRESENCE_LABEL: Record<
  EnginePresence,
  { text: string; tone: "success" | "critical" | "muted" }
> = {
  published: { text: "Existe en el motor", tone: "success" },
  missing: { text: "No existe en el motor", tone: "critical" },
  unknown: { text: "Sin confirmar", tone: "muted" },
  unset: { text: "—", tone: "muted" },
};

/** El estado de una versión del Motor, en palabras. Un estado desconocido se muestra legible. */
const VERSION_STATUS: Record<string, string> = {
  DRAFT: "borrador",
  COMPILED: "compilada",
  SUBMITTED: "enviada a aprobación",
  APPROVED: "aprobada",
  DEPLOYED: "desplegada",
  DEPLOYED_TO_DEV: "desplegada en desarrollo",
  RETIRED: "retirada",
  REJECTED: "rechazada",
};

export function versionStatusLabel(status: string | null): string | null {
  if (!status) return null;
  return VERSION_STATUS[status] ?? status.replaceAll("_", " ").toLowerCase();
}

/**
 * Por qué no se pudo leer el catálogo. Antes cualquier fallo —también un 403 por rol— decía «el
 * servicio interno no respondió», que manda a esperar a quien en realidad no tiene acceso.
 */
export function catalogErrorText(error: unknown): string {
  if (isAtlasApiError(error) && error.status === 403) {
    return "Tu rol no tiene acceso a esta configuración. La ven operaciones, riesgo y administración.";
  }
  if (isAtlasApiError(error) && error.status === 401) {
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }
  return "No se pudo leer el catálogo. Vuelve a intentarlo en unos segundos.";
}

/** El error al guardar: sólo el 422 significa «el Motor no publica ese artefacto». */
export function assignErrorText(error: unknown): string {
  if (isAtlasApiError(error) && error.status === 422) {
    return "El motor no publica ese artefacto. Elige uno de la lista y vuelve a intentarlo.";
  }
  if (isAtlasApiError(error) && error.status === 403) {
    return "Tu rol no puede cambiar qué artefacto decide.";
  }
  return "No se pudo guardar. Vuelve a intentarlo en unos segundos.";
}
