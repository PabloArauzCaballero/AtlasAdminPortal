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
export function runRuntimeJob(
  definition: RuntimeJobDefinition,
  body: RuntimeJobBody,
) {
  // Casi todos cuelgan de `/operations/jobs`; el que no, lo declara en el
  // catálogo porque su regla de negocio vive en otro módulo del backend.
  const path = definition.path ?? `/operations/jobs/${definition.code}`;
  return apiRequest<RuntimeJobRun>(path, {
    method: "POST",
    body,
    headers: {
      "x-idempotency-key": idempotencyKey(`runtime-job-${definition.code}`),
    },
  });
}
