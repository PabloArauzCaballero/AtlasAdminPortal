"use client";

import { useQuery } from "@tanstack/react-query";
import type { QueryParams } from "@/shared/api/types";
import { listGovernedView } from "./services";
import type { GovernedViewKey } from "./types";

export function useGovernedView(view: GovernedViewKey, query: QueryParams) {
  return useQuery({
    queryKey: ["internal", "views", view, query],
    queryFn: () => listGovernedView(view, query),
  });
}
