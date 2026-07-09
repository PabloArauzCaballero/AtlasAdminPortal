"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { getDataExport, listDataExports } from "./services";

export function useDataExports(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.dataExports(query),
    queryFn: () => listDataExports(query),
  });
}

export function useDataExport(exportId: string) {
  return useQuery({
    queryKey: queryKeys.dataExport(exportId),
    queryFn: () => getDataExport(exportId),
    enabled: Boolean(exportId),
  });
}
