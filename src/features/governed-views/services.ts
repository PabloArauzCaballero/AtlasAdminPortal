import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { GovernedViewKey, GovernedViewResponse } from "./types";

/** Las vistas son de sólo lectura: no hay más operación que consultarlas. */
export function listGovernedView(view: GovernedViewKey, query: QueryParams) {
  return apiRequest<GovernedViewResponse>(`/internal/views/${view}`, { query });
}
