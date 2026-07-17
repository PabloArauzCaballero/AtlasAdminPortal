import type { EndpointItem } from "@/features/systems/types";
import { getQaAllowedHosts } from "@/shared/api/config";
import { QA_BASE_ROUTE_OPTIONS, resolveQaBaseRoute } from "./base-routes";

/**
 * Base route cuyo host lo escribe el operador en el formulario: es la única que
 * no se considera confiable por sí misma y debe pasar por la allowlist.
 */
const OPERATOR_CONTROLLED_ROUTE_KEYS = new Set(["CUSTOM_HOST"]);

const KNOWN_QA_ENVIRONMENTS = ["LOCAL", "STAGING", "PRODUCTION_READONLY"];

const SENSITIVE_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "proxy-authorization",
  "x-csrf-token",
  "x-xsrf-token",
];

const BLOCKED_CUSTOM_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "transfer-encoding",
  "upgrade",
  "origin",
  "referer",
]);

export function isMutatingMethod(method?: string | null): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

export function sanitizeCustomHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(
        ([key, value]) => key.trim() && value !== undefined && value !== null,
      )
      .filter(([key]) => !BLOCKED_CUSTOM_HEADERS.has(key.toLowerCase()))
      .map(([key, value]) => [key.trim(), String(value)]),
  );
}

export function redactedHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveHeader(key) ? redactValue(value) : value,
    ]),
  );
}

export function assertRequestAllowed(input: {
  endpoint: EndpointItem;
  method: string;
  environment: string;
  dryRun: boolean;
  allowMutations: boolean;
}): void {
  const environment = input.environment.toUpperCase();
  const mutates =
    isMutatingMethod(input.method) ||
    Boolean(input.endpoint.isDestructive) ||
    input.endpoint.isReadonly === false;

  if (environment === "PRODUCTION_READONLY" && !input.dryRun) {
    throw new Error(
      "Producción readonly solo permite dry-run desde el QA Lab.",
    );
  }

  if (mutates && !input.dryRun && !input.allowMutations) {
    throw new Error(
      "El endpoint puede modificar datos. Activa 'permitir mutación real' para ejecutarlo.",
    );
  }

  if (input.endpoint.testEnvironmentOnly && environment !== "LOCAL") {
    throw new Error(
      "Este endpoint solo puede ejecutarse en ambiente local/testing.",
    );
  }
}

/**
 * Hosts a los que el QA Lab puede enviar credenciales de sesión: las bases
 * propias del portal (donde el token va legítimamente) más la allowlist de
 * entorno para hosts escritos a mano por el operador.
 */
export function getQaTrustedHosts(): string[] {
  return [...new Set([...getPortalBaseHosts(), ...getQaAllowedHosts()])];
}

export function isHostAllowed(rawUrl: string): boolean {
  const host = hostOf(rawUrl);
  return host !== null && getQaTrustedHosts().includes(host);
}

export function assertHostAllowed(rawUrl: string): void {
  if (isHostAllowed(rawUrl)) return;
  const host = hostOf(rawUrl);
  throw new Error(
    `El host destino${host ? ` (${host})` : ""} no está en la allowlist del QA Lab. ` +
      "No se envían credenciales a hosts no confiables. " +
      "Añádelo a NEXT_PUBLIC_QA_ALLOWED_HOSTS si es un backend de ATLAS.",
  );
}

/**
 * Hosts alcanzables sin que el operador escriba una URL: son las bases que el
 * propio portal ya considera confiables para su sesión.
 */
function getPortalBaseHosts(): string[] {
  const hosts = QA_BASE_ROUTE_OPTIONS.filter(
    (option) => !OPERATOR_CONTROLLED_ROUTE_KEYS.has(option.key),
  ).flatMap((option) =>
    KNOWN_QA_ENVIRONMENTS.map((environment) =>
      hostOf(resolveQaBaseRoute({ environment, baseRouteKey: option.key })),
    ),
  );
  return hosts.filter((host): host is string => host !== null);
}

function hostOf(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function isSensitiveHeader(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_HEADER_NAMES.some((item) => normalized.includes(item));
}

function redactValue(value: string): string {
  if (!value) return "[redacted]";
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}
