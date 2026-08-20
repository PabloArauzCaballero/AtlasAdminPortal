import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  ActionLog,
  ActionLogListResponse,
  MongoLogListResponse,
} from "./types";
import { normalizePaginatedResponse } from "./normalizers";

/**
 * Los servicios de OBSERVABILIDAD del portal: la auditoría SQL de acciones y el tail de
 * `Archivo.log` sincronizado a MongoDB.
 *
 * Viven aparte de `services.ts` porque son lo que alimenta una sola pantalla —la terminal de
 * auditoría— y porque el catálogo de sistemas ya rozaba el tope de tamaño del repo. Separarlos por
 * dominio es preferible a recortar comentarios para caber.
 */

const ACTION_LOG_KEYS = ["actionLogs", "logs", "records", "results"];
export async function listActionLogs(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/action-logs", { query });
  return normalizePaginatedResponse<ActionLogListResponse["items"][number]>(
    response,
    ACTION_LOG_KEYS,
  );
}

/**
 * Contesta `{ data: { items } }`, no un array: la firma decía `ActionLog[]` y nadie desenvolvía, así
 * que `logs.data[0]` era `undefined` y `DataTable` recibía un no-array. Ésa era la traza completa de
 * `/internal/audit/request/:id` en blanco — no faltaban permisos: se leía mal la respuesta.
 */
export async function getActionLogsByRequest(requestId: string) {
  const response = await apiRequest<unknown>(
    `/systems/action-logs/by-request/${encodeURIComponent(requestId)}`,
  );
  return normalizePaginatedResponse<ActionLog>(response, ACTION_LOG_KEYS).items;
}

export function listMongoLogs(query: QueryParams) {
  return apiRequest<MongoLogListResponse>("/systems/logs/mongo", { query });
}
