import { getApiBaseUrl } from "@/shared/api/config";

export type QaEnvironment =
  "LOCAL" | "STAGING" | "PRODUCTION_READONLY" | string;

export function getQaEnvironmentBaseUrl(environment: QaEnvironment): string {
  const normalized = environment.trim().toUpperCase();
  if (normalized === "STAGING") {
    return (
      process.env.NEXT_PUBLIC_STAGING_API_BASE_URL?.trim() || getApiBaseUrl()
    );
  }
  if (normalized === "PRODUCTION_READONLY") {
    return (
      process.env.NEXT_PUBLIC_PROD_READONLY_API_BASE_URL?.trim() ||
      getApiBaseUrl()
    );
  }
  // Sin base local explícita, la del propio portal (que en desarrollo ya es localhost:3005).
  return process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL?.trim() || getApiBaseUrl();
}

/**
 * El ambiente de la prueba sale del despliegue, no de un selector: en un portal desplegado sólo hay
 * una API, y elegir «STAGING» o «LOCAL» a mano sólo servía para apuntar a un host que no existe.
 * En producción las pruebas quedan en sólo lectura.
 */
export function defaultQaEnvironment(): QaEnvironment {
  const deployment = (process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  return deployment === "production" ? "PRODUCTION_READONLY" : "LOCAL";
}

/** ¿El destino es producción? Producción sólo admite previsualizar. */
export function isProductionTarget(environment: string): boolean {
  return environment.trim().toUpperCase() === "PRODUCTION_READONLY";
}

/**
 * Ambientes donde vale correr lo marcado «sólo para pruebas»: LOCAL, que es también el ambiente que
 * `defaultQaEnvironment` da a los portales de DEV y TEST. STAGING compartido y producción, no.
 */
export function isTestingTarget(environment: string): boolean {
  return environment.trim().toUpperCase() === "LOCAL";
}
