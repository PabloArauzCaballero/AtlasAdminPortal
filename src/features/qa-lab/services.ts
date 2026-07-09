import { listEndpoints } from "@/features/systems/services";
import type { QueryParams } from "@/shared/api/types";

export function listLabEndpoints(query: QueryParams) {
  return listEndpoints(query);
}
