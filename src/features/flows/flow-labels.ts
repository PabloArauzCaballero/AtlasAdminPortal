import type { FlowDetail } from "./types";

/**
 * Los códigos que el análisis de flujos guarda, en palabras. Un código que todavía no está aquí se
 * enseña tal cual antes que esconderlo: es preferible una palabra rara a perder el dato.
 */
const DISCOVERY: Record<string, string> = {
  DISCOVERED: "Encontrada en el código",
  PARTIAL: "Analizada a medias",
  MAPPED: "Analizada por completo",
};

const VERIFICATION: Record<string, string> = {
  UNVERIFIED: "Sin verificar",
  VERIFIED: "Verificada con llamadas reales",
  BROKEN: "Rota: una llamada real contradijo el mapa",
};

const FRESHNESS: Record<string, string> = {
  FRESH: "Al día",
  STALE: "Su código cambió desde la última verificación",
};

const KIND: Record<string, string> = {
  READ: "Consulta",
  CREATE: "Alta",
  UPDATE: "Modificación",
  DELETE: "Borrado",
  ACTION: "Acción",
  NAVIGATION: "Navegación",
  CLIENT_ONLY: "Sólo en la pantalla",
  CROSS_BLOCK: "Llamada entre sistemas",
};

const TESTS: Record<string, string> = {
  TESTED: "Una prueba automática la ejercita",
  UNTESTED: "Ninguna prueba automática la ejercita",
};

const CONTRACT: Record<string, string> = {
  IN_CONTRACT: "Documentada",
  CODE_ONLY: "Sin contrato: existe en el código pero no está documentada",
  NO_CONTRACT: "Contrato sin revisar",
};

const FINDING_STATUS: Record<string, string> = {
  open: "abierto",
  acknowledged: "reconocido",
  resolved: "resuelto",
  false_positive: "falso positivo",
};

const word = (
  table: Record<string, string>,
  value: string | null | undefined,
) => (value ? (table[value] ?? value) : "—");

export const discoveryLabel = (value?: string | null) => word(DISCOVERY, value);
export const verificationLabel = (value?: string | null) =>
  word(VERIFICATION, value);
export const freshnessLabel = (value?: string | null) => word(FRESHNESS, value);
export const kindLabel = (value?: string | null) => word(KIND, value);
export const testsLabel = (value?: string | null) => word(TESTS, value);
export const contractLabel = (value?: string | null) => word(CONTRACT, value);
export const findingStatusLabel = (value?: string | null) =>
  word(FINDING_STATUS, value);

/** Qué protege la operación, dicho como lo vive quien la usa. */
export function authorizationLabel(
  flow: Pick<
    FlowDetail,
    "isPublic" | "internalPermissions" | "roles" | "guards"
  >,
): string {
  if (flow.isPublic) return "Pública, sin inicio de sesión";
  if (flow.internalPermissions.length) return "Exige un permiso interno";
  if (flow.roles.length) return "Exige un rol";
  if (flow.guards.length) return "Protección propia";
  return "Sólo exige haber iniciado sesión";
}
