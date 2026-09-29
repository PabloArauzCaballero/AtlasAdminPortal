import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type {
  BusinessTermDetail,
  BusinessTermFacets,
  BusinessTermListResponse,
} from "./types";

export function listBusinessTerms(query: QueryParams) {
  return apiRequest<BusinessTermListResponse>(
    "/internal/business-metadata/glossary",
    { query },
  );
}

/** Valores del filtro «Dominio» y reparto por tipo, contados en el servidor sobre el catálogo entero. */
export function listBusinessTermFacets() {
  return apiRequest<BusinessTermFacets>(
    "/internal/business-metadata/glossary/facets",
  );
}

export function getBusinessTerm(termId: string) {
  return apiRequest<BusinessTermDetail>(
    `/internal/business-metadata/terms/${termId}`,
  );
}
