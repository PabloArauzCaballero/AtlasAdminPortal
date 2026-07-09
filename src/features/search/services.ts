import { apiRequest } from "@/shared/api/client";
import { normalizeSearchPayload } from "./normalize";
import type { GlobalSearchResponse } from "./types";

export async function globalSearch(q: string): Promise<GlobalSearchResponse> {
  const payload = await apiRequest<unknown>("/internal/search", {
    query: { q, limit: 50 },
  });
  return normalizeSearchPayload(payload);
}
