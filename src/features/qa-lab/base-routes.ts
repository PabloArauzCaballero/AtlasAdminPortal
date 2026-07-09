import { getApiBaseUrl } from "@/shared/api/config";
import { getQaEnvironmentBaseUrl } from "./environment";

export type QaBaseRouteKey =
  | "ENVIRONMENT_DEFAULT"
  | "CUSTOM_HOST"
  | "LOCAL_API_V1"
  | "LOCAL_ROOT"
  | "CONFIGURED_API"
  | "STAGING_CONFIGURED"
  | "PRODUCTION_READONLY_CONFIGURED";

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
    hint: "http://localhost:3005/api/v1",
  },
  {
    key: "LOCAL_ROOT",
    label: "Local backend raiz",
    hint: "http://localhost:3005",
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
  return getQaEnvironmentBaseUrl(environment);
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

type ResolveBaseRouteInput = {
  environment: string;
  baseRouteKey?: string;
  customHostUrl?: string;
};
