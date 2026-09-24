import { apiRequest } from "@/shared/api/client";
import type {
  QaCapabilities,
  QaCoverage,
  QaDatasetMode,
  QaPersonaStep,
  QaPreflight,
  QaRunPersonaPage,
  QaRunRequest,
  QaRunStatus,
  QaRunSummary,
  QaSampleInputs,
  QaTemplateDetail,
  QaTemplateSummary,
} from "./types";

/**
 * Cliente de la API de control QA. Usa el MISMO `apiRequest` que el resto del portal: sesión
 * interna, CSRF, refresco y reintentos de pasarela. El tenant y el operador los deriva el servidor
 * de la sesión, así que aquí no se manda ninguno.
 */
const BASE = "/systems/qa";

function templatePath(code: string, version: string) {
  return `${BASE}/journey-templates/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}`;
}

export function getQaCapabilities() {
  return apiRequest<QaCapabilities>(`${BASE}/capabilities`);
}

export async function listQaTemplates(workflowCode?: string) {
  const response = await apiRequest<{ items: QaTemplateSummary[] }>(
    `${BASE}/journey-templates`,
    { query: workflowCode ? { workflowCode } : undefined },
  );
  return response.items ?? [];
}

export function getQaTemplate(code: string, version: string) {
  return apiRequest<QaTemplateDetail>(templatePath(code, version));
}

export function getQaCoverage(workflowCode: string) {
  return apiRequest<QaCoverage>(`${BASE}/coverage`, {
    query: { workflowCode },
  });
}

export function getQaSampleInputs(
  code: string,
  version: string,
  body: { seed: string; count: number; datasetMode: QaDatasetMode },
) {
  return apiRequest<QaSampleInputs>(
    `${templatePath(code, version)}/sample-inputs`,
    {
      method: "POST",
      body,
    },
  );
}

export function preflightQaRun(body: QaRunRequest) {
  return apiRequest<QaPreflight>(`${BASE}/runs/preflight`, {
    method: "POST",
    body,
  });
}

/**
 * Lanza el plan validado. La `idempotencyKey` la genera quien llama UNA vez por intento de
 * lanzamiento: el doble clic o un reintento de red reenvían la misma y el servidor devuelve la
 * misma corrida en vez de crear otra.
 */
export function launchQaRun(
  plan: { planId: string; planHash: string },
  idempotencyKey: string,
) {
  return apiRequest<{ runId: string; status: QaRunStatus }>(`${BASE}/runs`, {
    method: "POST",
    body: plan,
    idempotencyKey,
  });
}

export async function listQaRuns(
  query: { limit?: number; templateCode?: string } = {},
) {
  const response = await apiRequest<{ items: QaRunSummary[] }>(`${BASE}/runs`, {
    query: { limit: query.limit ?? 20, templateCode: query.templateCode },
  });
  return response.items ?? [];
}

export function getQaRun(runId: string) {
  return apiRequest<QaRunSummary>(`${BASE}/runs/${encodeURIComponent(runId)}`);
}

export function listQaRunPersonas(
  runId: string,
  query: { page: number; limit: number; status?: string },
) {
  return apiRequest<QaRunPersonaPage>(
    `${BASE}/runs/${encodeURIComponent(runId)}/personas`,
    { query },
  );
}

export async function listQaPersonaSteps(runId: string, personaKey: string) {
  const response = await apiRequest<{ items: QaPersonaStep[] }>(
    `${BASE}/runs/${encodeURIComponent(runId)}/personas/${encodeURIComponent(personaKey)}/steps`,
  );
  return response.items ?? [];
}

export function cancelQaRun(runId: string) {
  return apiRequest<{ runId: string; status: QaRunStatus }>(
    `${BASE}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" },
  );
}
