import { getApiBaseUrl } from "@/shared/api/config";
import { getQaEnvironmentBaseUrl } from "./environment";

export type QaBaseRouteKey =
  | "ENVIRONMENT_DEFAULT"
  | "CUSTOM_HOST"
  | "LOCAL_API_V1"
  | "LOCAL_ROOT"
  | "CONFIGURED_API"
  | "STAGING_CONFIGURED"
  | "PRODUCTION_READONLY_CONFIGURED"
  | "MOCK_PROVIDERS";

export type QaBaseRouteOption = {
  key: QaBaseRouteKey;
  label: string;
  hint: string;
};

export const DEFAULT_QA_BASE_ROUTE: QaBaseRouteKey = "ENVIRONMENT_DEFAULT";

export const QA_BASE_ROUTE_OPTIONS: QaBaseRouteOption[] = [
  {
    key: "ENVIRONMENT_DEFAULT",
    label: "Base del ambiente seleccionado",
    hint: "Usa LOCAL, STAGING o PRODUCTION_READONLY segun el ambiente elegido.",
  },
  {
    key: "CUSTOM_HOST",
    label: "Host URL manual",
    hint: "Usa el host escrito en el formulario del laboratorio.",
  },
  {
    key: "LOCAL_API_V1",
    label: "Local backend /api/v1",
    hint: "Backend levantado en tu máquina, con prefijo: http://localhost:3005/api/v1",
  },
  {
    key: "LOCAL_ROOT",
    label: "Local backend raiz",
    hint: "Backend levantado en tu máquina, sin prefijo: http://localhost:3005",
  },
  {
    key: "CONFIGURED_API",
    label: "NEXT_PUBLIC_API_BASE_URL",
    hint: "Base publica configurada para el portal.",
  },
  {
    key: "STAGING_CONFIGURED",
    label: "Staging configurado",
    hint: "NEXT_PUBLIC_STAGING_API_BASE_URL con fallback al ambiente.",
  },
  {
    key: "PRODUCTION_READONLY_CONFIGURED",
    label: "Produccion readonly configurada",
    hint: "NEXT_PUBLIC_PROD_READONLY_API_BASE_URL con fallback al ambiente.",
  },
  {
    key: "MOCK_PROVIDERS",
    label: "Mock de proveedores externos",
    hint: "NEXT_PUBLIC_QA_MOCK_BASE_URL (default http://localhost:4010/mock). Simula SEGIP, INFOCENTER, QR, banca, telco, Facebook, WhatsApp y digital trust.",
  },
];

export function normalizeQaBaseRouteKey(value?: string): QaBaseRouteKey {
  return QA_BASE_ROUTE_OPTIONS.some((option) => option.key === value)
    ? (value as QaBaseRouteKey)
    : DEFAULT_QA_BASE_ROUTE;
}

export function resolveQaBaseRoute(input: ResolveBaseRouteInput): string {
  const key = normalizeQaBaseRouteKey(input.baseRouteKey);
  if (key === "CUSTOM_HOST" && input.customHostUrl?.trim()) {
    return normalizeBaseUrl(input.customHostUrl);
  }
  const value = resolveConfiguredRoute(key, input.environment);
  return normalizeBaseUrl(value);
}

export function getQaBaseRouteHint(value?: string): string {
  const key = normalizeQaBaseRouteKey(value);
  return QA_BASE_ROUTE_OPTIONS.find((option) => option.key === key)?.hint ?? "";
}

function resolveConfiguredRoute(
  key: QaBaseRouteKey,
  environment: string,
): string {
  if (key === "LOCAL_API_V1") return "http://localhost:3005/api/v1";
  if (key === "LOCAL_ROOT") return "http://localhost:3005";
  if (key === "CONFIGURED_API") return getApiBaseUrl();
  if (key === "STAGING_CONFIGURED") {
    return (
      process.env.NEXT_PUBLIC_STAGING_API_BASE_URL ||
      getQaEnvironmentBaseUrl("STAGING")
    );
  }
  if (key === "PRODUCTION_READONLY_CONFIGURED") {
    return (
      process.env.NEXT_PUBLIC_PROD_READONLY_API_BASE_URL ||
      getQaEnvironmentBaseUrl("PRODUCTION_READONLY")
    );
  }
  if (key === "MOCK_PROVIDERS") return getQaMockProvidersBaseUrl();
  return getQaEnvironmentBaseUrl(environment);
}

/**
 * Base del servidor de mocks de proveedores externos (`AtlasExternalProvidersMock`). Es una base
 * FIJA del portal, no un host escrito a mano por el operador: por eso entra en
 * `getPortalBaseHosts()` de `qa-safety.ts` igual que las demás claves configuradas, en vez de pasar
 * por la allowlist de `CUSTOM_HOST`. El default de desarrollo coincide con el puerto real del
 * repo hermano (`AtlasExternalProvidersMock`, ver su README): `http://localhost:4010/mock`.
 */
export function getQaMockProvidersBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_QA_MOCK_BASE_URL?.trim() ||
    "http://localhost:4010/mock"
  );
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

type ResolveBaseRouteInput = {
  environment: string;
  baseRouteKey?: string;
  customHostUrl?: string;
};
