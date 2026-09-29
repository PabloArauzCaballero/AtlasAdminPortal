import { apiRequest } from "@/shared/api/client";
import { normalizeSearchPayload } from "./normalize";
import type { GlobalSearchKind, GlobalSearchResponse } from "./types";

export const SEARCH_PAGE_SIZE = 20;

/**
 * Una página de UN tipo de resultado. `totals` trae el conteo real de los
 * cuatro tipos en la misma respuesta, así que las pestañas saben cuántos hay
 * en cada una sin pedirlos por separado.
 */
export async function globalSearch(
  q: string,
  kind: GlobalSearchKind | null,
  page: number,
  limit = SEARCH_PAGE_SIZE,
): Promise<GlobalSearchResponse> {
  // Sin `kind` (sugerencias de la barra superior) trae hasta `limit` de CADA tipo.
  const payload = await apiRequest<unknown>("/internal/search", {
    query: { q, kind: kind ?? undefined, page, limit },
  });
  return normalizeSearchPayload(payload);
}
