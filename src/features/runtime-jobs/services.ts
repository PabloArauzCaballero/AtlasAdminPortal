import { apiRequest } from "@/shared/api/client";
import type {
  RuntimeJobBody,
  RuntimeJobDefinition,
  RuntimeJobRun,
} from "./types";

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * `x-tenant-id` ya lo pone el cliente API (ver shared/api/request-init.ts);
 * acá solo hace falta la idempotency key, que `RuntimeJobsController` exige
 * (mínimo 8 caracteres) para que un doble click no dispare el job dos veces.
 */
export async function runRuntimeJob(
  definition: RuntimeJobDefinition,
  body: RuntimeJobBody,
): Promise<RuntimeJobRun> {
  // Casi todos cuelgan de `/operations/jobs`; el que no, lo declara en el
  // catálogo porque su regla de negocio vive en otro módulo del backend.
  const path = definition.path ?? `/operations/jobs/${definition.code}`;
  const respuesta = await apiRequest<unknown>(path, {
    method: "POST",
    body,
    headers: {
      "x-idempotency-key": idempotencyKey(`runtime-job-${definition.code}`),
    },
  });
  return comoCorrida(respuesta);
}

/**
 * Los jobs de `/operations/jobs` devuelven `{ jobRunId, status, result }`; los que viven en su
 * módulo (mora, onboardings abandonados) devuelven su resultado a secas. Sin normalizar, la
 * tarjeta pintaba «Job run #undefined» y un estado vacío sobre una ejecución que sí ocurrió.
 */
export function comoCorrida(respuesta: unknown): RuntimeJobRun {
  if (
    respuesta !== null &&
    typeof respuesta === "object" &&
    "jobRunId" in respuesta &&
    "status" in respuesta
  ) {
    return respuesta as RuntimeJobRun;
  }
  return { jobRunId: null, status: "completed", result: respuesta };
}
