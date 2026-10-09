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
 * Valores de `NEXT_PUBLIC_ATLAS_ENVIRONMENT` que declaran un ambiente DE PRUEBAS. Lista cerrada:
 * `development`, `test` y `qa`, más los dos que ya usan los despliegues de este repo y que no se
 * pueden renombrar sin reconstruir todo — `local` (`.env.example`) y `vps-testing` (DEV y TEST en
 * Coolify, `Dockerfile.dev`)—. Se comparan normalizados (`trim().toLowerCase()`).
 */
export const TESTING_DEPLOYMENTS: ReadonlySet<string> = new Set([
  "development",
  "test",
  "qa",
  "local",
  "vps-testing",
]);

/**
 * El ambiente de la prueba sale del despliegue, no de un selector: en un portal desplegado sólo hay
 * una API, y elegir «STAGING» o «LOCAL» a mano sólo servía para apuntar a un host que no existe.
 *
 * FALLA CERRADO (ADM-08, auditoría 2026-10-09): antes sólo el literal exacto `production` dejaba el
 * QA Lab en sólo lectura, y `prod`, `PROD-BO`, `Production ` o una variable vacía lo abrían a
 * mutaciones y carga. Ahora es al revés: sólo un ambiente de pruebas DECLARADO (lista de arriba)
 * permite mutar; cualquier otro valor, también el vacío, queda en sólo lectura.
 *
 * Es una barrera de la interfaz, no un control de seguridad: el navegador de quien opera la puede
 * saltar. La garantía de que en producción no se muta desde el QA Lab tiene que darla el backend.
 */
export function defaultQaEnvironment(): QaEnvironment {
  const deployment = (process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  return TESTING_DEPLOYMENTS.has(deployment) ? "LOCAL" : "PRODUCTION_READONLY";
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
