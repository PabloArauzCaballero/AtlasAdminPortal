import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import type { BusinessTermDetail, BusinessTermListResponse } from "./types";

export function listBusinessTerms(query: QueryParams) {
  return apiRequest<BusinessTermListResponse>(
    "/internal/business-metadata/glossary",
    { query },
  );
}

export function getBusinessTerm(termId: string) {
  return apiRequest<BusinessTermDetail>(
    `/internal/business-metadata/terms/${termId}`,
  );
}
