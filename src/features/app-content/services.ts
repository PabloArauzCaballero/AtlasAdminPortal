import { apiRequest } from "@/shared/api/client";
import type {
  AppContentList,
  AppContentQuery,
  AppContentUpsert,
} from "./types";

/** El listado paginado del portal: el buscador y la visibilidad viajan al servidor. */
export function listAppContent(surface?: string, query: AppContentQuery = {}) {
  return apiRequest<AppContentList>("/operations/app-content", {
    query: {
      surface,
      page: query.page,
      limit: query.limit,
      q: query.q?.trim() || undefined,
      active: query.active || undefined,
    },
  });
}

/**
 * Crear y editar son la MISMA operación.
 *
 * El backend resuelve por `surface` + `contentKey` + `locale`, así que reeditar una pieza la
 * actualiza en lugar de duplicarla. Tener dos llamadas —una para crear y otra para editar— obligaría
 * a esta pantalla a saber si la pieza ya existe, y equivocarse produciría dos versiones del mismo
 * texto compitiendo por salir en la app.
 */
export function saveAppContent(body: AppContentUpsert) {
  return apiRequest<unknown>("/operations/app-content", {
    method: "PUT",
    body,
  });
}

export function removeAppContent(contentId: string) {
  return apiRequest<unknown>(`/operations/app-content/${contentId}`, {
    method: "DELETE",
  });
}
