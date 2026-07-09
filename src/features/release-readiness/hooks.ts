"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getReleaseReadiness } from "./services";

export function useReleaseReadiness() {
  return useQuery({
    queryKey: queryKeys.releaseReadiness,
    queryFn: getReleaseReadiness,
  });
}
