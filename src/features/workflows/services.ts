import { apiRequest } from "@/shared/api/client";
import { isAtlasApiError } from "@/shared/api/errors";
import type { QueryParams } from "@/shared/api/types";
import type {
  WorkflowGraph,
  WorkflowSummary,
  WorkflowTransitionCheck,
  WorkflowTree,
  WorkflowTreeQuery,
  WorkflowConsistencyReport,
} from "./types";

/**
 * Lectura del catálogo de flujos. Todo bajo `/workflows`, sin `x-tenant-id`:
 * el catálogo describe el software desplegado, no la operación de un cliente
 * (el avance por cliente vive en `/customers/:id/workflow-progress`).
 */

function toQuery(query: WorkflowTreeQuery | undefined): QueryParams {
  if (!query) return {};
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => Boolean(value)),
  ) as QueryParams;
}

export async function listWorkflows(query: QueryParams = {}) {
  const response = await apiRequest<
    WorkflowSummary[] | { data: WorkflowSummary[] }
  >("/workflows", { query });
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export function getWorkflowVersions(workflowCode: string) {
  return apiRequest<WorkflowSummary[]>(`/workflows/${workflowCode}/versions`);
}

export function getWorkflowTree(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return apiRequest<WorkflowTree>(`/workflows/${workflowCode}`, {
    query: toQuery(query),
  });
}

export function getWorkflowGraph(
  workflowCode: string,
  query?: WorkflowTreeQuery,
) {
  return apiRequest<WorkflowGraph>(`/workflows/${workflowCode}/graph`, {
    query: toQuery(query),
  });
}

/*
 * `GET /workflows/:code/transitions` no se envuelve: el árbol (`getWorkflowTree`) ya devuelve las
 * transiciones y es lo que pinta el lienzo. Una segunda forma de pedir lo mismo se desincroniza en
 * cuanto una de las dos cambie de forma.
 */

/**
 * Pregunta al grafo declarado si un salto es legal. No autoriza la petición:
 * los guards y las reglas de cada servicio se siguen aplicando al ejecutar el
 * endpoint de verdad.
 */
export function validateWorkflowTransition(
  workflowCode: string,
  body: Readonly<{
    fromStepCode?: string;
    toStepCode: string;
    role?: string;
    currentState?: string;
    completedStepCodes?: string[];
    version?: string;
  }>,
) {
  return apiRequest<WorkflowTransitionCheck>(
    `/workflows/${workflowCode}/transitions/validate`,
    { method: "POST", body },
  );
}

export type WorkflowStepTrial = Readonly<{
  method: string;
  path: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  body: unknown;
  requestId?: string;
}>;

/** Sustituye `:param` por su valor; lo que no se rellena se queda literal y se avisa. */
export function resolveRoutePath(
  routePath: string,
  pathParams: Readonly<Record<string, string>>,
): string {
  return routePath.replace(/:([a-zA-Z0-9_]+)/g, (match, name: string) => {
    const value = pathParams[name]?.trim();
    return value ? encodeURIComponent(value) : match;
  });
}

export function pathParamNames(routePath: string): string[] {
  return [...routePath.matchAll(/:([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
}

/**
 * Prueba un paso del flujo contra el MISMO backend que el resto del portal.
 *
 * No abre un canal nuevo ni acepta un host arbitrario: usa el cliente de API
 * con la sesión del portal, así que sólo puede llegar donde ya llega el resto
 * de la aplicación. Devuelve el estado tal cual —incluido el error— porque el
 * valor de la prueba está justamente en ver el 401 o el 422 que responde.
 */
export async function runWorkflowStepTrial(
  input: Readonly<{
    method: string;
    routePath: string;
    pathParams?: Record<string, string>;
    payload?: unknown;
  }>,
): Promise<WorkflowStepTrial> {
  const path = resolveRoutePath(input.routePath, input.pathParams ?? {});
  const method = input.method.toUpperCase();
  const startedAt = performance.now();
  const base = { method, path } as const;

  try {
    const body = await apiRequest<unknown>(path, {
      method,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : (input.payload ?? {}),
      // Una prueba que renueva la sesión enmascara el 401 que se está probando.
      skipRefresh: true,
    });
    return {
      ...base,
      status: 200,
      ok: true,
      latencyMs: Math.round(performance.now() - startedAt),
      body,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    if (isAtlasApiError(error)) {
      return {
        ...base,
        status: error.status,
        ok: false,
        latencyMs,
        body: error.payload ?? { message: error.message },
        requestId: error.requestId,
      };
    }
    return {
      ...base,
      status: 0,
      ok: false,
      latencyMs,
      body: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Informe de consistencia del flujo contra los endpoints REALES del proceso.
 *
 * Compara cada paso sembrado con las rutas montadas: ruta inexistente, código incoherente o estado
 * de ciclo de vida desconocido son errores; roles divergentes o endpoint no descubierto, avisos.
 * El endpoint existía —su propio comentario dice que «su consumidor natural es el portal interno y
 * CI»— y el portal no lo pedía, así que la deriva entre lo declarado y lo montado sólo se veía
 * llamando a mano.
 */
export function getWorkflowConsistency(workflowCode: string, version?: string) {
  return apiRequest<WorkflowConsistencyReport>(
    `/operations/workflows/${encodeURIComponent(workflowCode)}/consistency`,
    version ? { query: { version } } : {},
  );
}
