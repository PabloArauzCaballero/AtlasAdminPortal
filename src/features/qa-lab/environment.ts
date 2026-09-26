import { getApiBaseUrl } from "@/shared/api/config";

/**
 * Ambientes del laboratorio.
 *
 * `PORTAL` («Este mismo portal») es la API que usa el propio portal. En un portal desplegado es
 * `/api/v1`, RELATIVA: el navegador la resuelve contra el origen del portal y `rewrites()` la lleva
 * al backend. Antes el Lab abría en `LOCAL` —`http://localhost:3005`, el localhost del NAVEGADOR del
 * operador, que en un portal desplegado no es nadie— y los ambientes que usaban la base relativa
 * rompían en `new URL()` con «Invalid URL».
 */
export type QaEnvironment =
  "PORTAL" | "LOCAL" | "STAGING" | "PRODUCTION_READONLY" | string;

export const PORTAL_ENVIRONMENT = "PORTAL";

const LOCAL_API_BASE_URL = "http://localhost:3005/api/v1";

function browserOrigin(): string {
  if (typeof window === "undefined") return "http://localhost";
  const origin = window.location?.origin;
  return origin && origin !== "null" ? origin : "http://localhost";
}

/** Una base relativa (`/api/v1`) se resuelve contra el origen del portal; una absoluta, tal cual. */
export function resolveAgainstOrigin(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return new URL(trimmed || "/", browserOrigin())
    .toString()
    .replace(/\/+$/, "");
}

export function getQaEnvironmentBaseUrl(environment: QaEnvironment): string {
  const normalized = environment.trim().toUpperCase();
  if (normalized === PORTAL_ENVIRONMENT) {
    return resolveAgainstOrigin(getApiBaseUrl());
  }
  if (normalized === "STAGING") {
    return resolveAgainstOrigin(
      process.env.NEXT_PUBLIC_STAGING_API_BASE_URL?.trim() || getApiBaseUrl(),
    );
  }
  if (normalized === "PRODUCTION_READONLY") {
    return resolveAgainstOrigin(
      process.env.NEXT_PUBLIC_PROD_READONLY_API_BASE_URL?.trim() ||
        getApiBaseUrl(),
    );
  }
  return (
    process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL?.trim() || LOCAL_API_BASE_URL
  );
}

/** En tu máquina, «Tu máquina»; en un portal desplegado, «Este mismo portal». */
export function defaultQaEnvironment(): "LOCAL" | "PORTAL" {
  if (typeof window === "undefined") return "LOCAL";
  const host = window.location?.hostname ?? "";
  return host === "localhost" || host === "127.0.0.1" ? "LOCAL" : "PORTAL";
}

/** ¿El destino es producción? Producción sólo admite previsualizar. */
export function isProductionTarget(environment: string): boolean {
  const normalized = environment.trim().toUpperCase();
  if (normalized === "PRODUCTION_READONLY") return true;
  return (
    normalized === PORTAL_ENVIRONMENT &&
    (process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ?? "").trim().toLowerCase() ===
      "production"
  );
}

/** Ambientes donde vale correr lo marcado «sólo para pruebas». */
export function isTestingTarget(environment: string): boolean {
  const normalized = environment.trim().toUpperCase();
  return (
    normalized === "LOCAL" ||
    (normalized === PORTAL_ENVIRONMENT && !isProductionTarget(normalized))
  );
}
