import { getApiBaseUrl } from "@/shared/api/config";
import { getQaEnvironmentBaseUrl, resolveAgainstOrigin } from "./environment";

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
    label: "La del ambiente elegido",
    hint: "Usa la dirección del ambiente de arriba (este portal, tu máquina, pruebas o producción).",
  },
  {
    key: "CUSTOM_HOST",
    label: "Otra dirección, escrita a mano",
    hint: "Usa la dirección escrita en «Dirección manual». Sólo se admiten las de la lista permitida.",
  },
  {
    key: "LOCAL_API_V1",
    label: "Tu máquina, con /api/v1",
    hint: "Backend levantado en tu ordenador, con prefijo: http://localhost:3005/api/v1",
  },
  {
    key: "LOCAL_ROOT",
    label: "Tu máquina, sin prefijo",
    hint: "Backend levantado en tu ordenador, sin prefijo: http://localhost:3005",
  },
  {
    key: "CONFIGURED_API",
    label: "La API configurada del portal",
    hint: "La dirección que el portal usa para su propia API (NEXT_PUBLIC_API_BASE_URL).",
  },
  {
    key: "STAGING_CONFIGURED",
    label: "Pruebas compartido configurado",
    hint: "La API del entorno de pruebas compartido (NEXT_PUBLIC_STAGING_API_BASE_URL); si no hay, la del portal.",
  },
  {
    key: "PRODUCTION_READONLY_CONFIGURED",
    label: "Producción configurada (sólo lectura)",
    hint: "La API de producción (NEXT_PUBLIC_PROD_READONLY_API_BASE_URL); sólo admite previsualizar.",
  },
  {
    key: "MOCK_PROVIDERS",
    label: "Simulador de proveedores externos",
    hint: "El simulador de SEGIP, INFOCENTER, QR, banca, telco, Facebook, WhatsApp y confianza digital (NEXT_PUBLIC_QA_MOCK_BASE_URL, por defecto http://localhost:4010/mock).",
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
  if (key === "CONFIGURED_API") return resolveAgainstOrigin(getApiBaseUrl());
  if (key === "STAGING_CONFIGURED") {
    return getQaEnvironmentBaseUrl("STAGING");
  }
  if (key === "PRODUCTION_READONLY_CONFIGURED") {
    return getQaEnvironmentBaseUrl("PRODUCTION_READONLY");
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
