"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import { listGovernedView, listGovernedViewFacets } from "./services";
import type { GovernedViewKey } from "./types";

export function useGovernedView(view: GovernedViewKey, query: QueryParams) {
  return useQuery({
    queryKey: ["internal", "views", view, query],
    queryFn: () => listGovernedView(view, query),
    placeholderData: keepPreviousData,
  });
}

export function useGovernedViewFacets(view: GovernedViewKey) {
  return useQuery({
    queryKey: ["internal", "views", view, "facets"],
    queryFn: () => listGovernedViewFacets(view),
  });
}
