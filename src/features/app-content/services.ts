import { apiRequest } from "@/shared/api/client";
import type { AppContentList, AppContentUpsert } from "./types";

export function listAppContent(surface?: string) {
  const query = surface ? `?surface=${encodeURIComponent(surface)}` : "";
  return apiRequest<AppContentList>(`/operations/app-content${query}`);
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
