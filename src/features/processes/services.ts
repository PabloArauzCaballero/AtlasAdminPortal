import { apiRequest } from "@/shared/api/client";
import type {
  ProcessDetail,
  ProcessInstanceProgress,
  ProcessInstancesResponse,
  ProcessListResponse,
  ProcessWiringResponse,
} from "./types";

/** El permiso que abre la sección, igual en el menú, en las pantallas y en el backend. */
export const PROCESSES_PERMISSION = "workflows.read";

/**
 * La sección Procesos sólo LEE: todas las rutas son `GET /internal/processes…` con sesión interna
 * y el permiso `workflows.read`. El código de proceso viaja codificado aunque el backend ya lo
 * valide con `^[a-z][a-z0-9_]+$`: la URL la escribe quien pega un enlace, no sólo la tabla.
 */
const base = (code: string) =>
  `/internal/processes/${encodeURIComponent(code)}`;

export function listProcesses() {
  return apiRequest<ProcessListResponse>("/internal/processes");
}

export function getProcess(code: string) {
  return apiRequest<ProcessDetail>(base(code));
}

export function getProcessWiring(code: string) {
  return apiRequest<ProcessWiringResponse>(`${base(code)}/wiring`);
}

export type ProcessInstancesQuery = {
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
};

/** Los filtros vacíos no viajan: el backend los valida con Zod y un `status=` en blanco es 400. */
function compact(query: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );
}

export function listProcessInstances(
  code: string,
  query: ProcessInstancesQuery,
) {
  // Una búsqueda de sólo espacios llega al backend como cadena vacía y su esquema la rechaza con 400.
  const search = query.search?.trim();
  return apiRequest<ProcessInstancesResponse>(`${base(code)}/instances`, {
    query: compact({ ...query, search }),
  });
}

export function getInstanceProgress(code: string, instanceId: string) {
  return apiRequest<ProcessInstanceProgress>(
    `${base(code)}/instances/${encodeURIComponent(instanceId)}/progress`,
  );
}
