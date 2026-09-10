"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getDocumentationGate } from "./services";

export function useDocumentationGate() {
  return useQuery({
    queryKey: queryKeys.flowDocumentationGate,
    queryFn: getDocumentationGate,
  });
}
