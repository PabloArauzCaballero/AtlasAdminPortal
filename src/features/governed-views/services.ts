import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  GovernedViewFacets,
  GovernedViewKey,
  GovernedViewResponse,
} from "./types";

/** Las vistas son de sólo lectura: no hay más operación que consultarlas. */
export function listGovernedView(view: GovernedViewKey, query: QueryParams) {
  return apiRequest<GovernedViewResponse>(`/internal/views/${view}`, { query });
}

/** Valores de cada filtro de la vista, sobre la vista entera (no sobre la página cargada). */
export function listGovernedViewFacets(view: GovernedViewKey) {
  return apiRequest<GovernedViewFacets>(`/internal/views/${view}/facets`);
}
