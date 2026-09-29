"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getBusinessTerm,
  listBusinessTermFacets,
  listBusinessTerms,
} from "./services";

export function useBusinessTerms(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.businessTerms(query),
    queryFn: () => listBusinessTerms(query),
    // Cambiar de página o de filtro no vacía la tabla mientras llega la siguiente respuesta.
    placeholderData: keepPreviousData,
  });
}

export function useBusinessTermFacets() {
  return useQuery({
    queryKey: queryKeys.businessTermFacets,
    queryFn: listBusinessTermFacets,
  });
}

export function useBusinessTerm(termId: string) {
  return useQuery({
    queryKey: queryKeys.businessTerm(termId),
    queryFn: () => getBusinessTerm(termId),
    enabled: Boolean(termId),
  });
}
