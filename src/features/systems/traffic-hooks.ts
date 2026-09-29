"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTrafficLatencyReport } from "./services";
import type { TrafficRoutesQuery } from "./types";

/** Las rutas del informe de tráfico, paginadas y filtradas en el servidor (la tabla, no los gráficos). */
export function useTrafficRoutesPage(
  windowHours: number,
  routes: TrafficRoutesQuery,
  options?: { live?: boolean },
) {
  return useQuery({
    queryKey: [
      "systems",
      "traffic-latency-routes",
      windowHours,
      routes,
    ] as const,
    queryFn: () => getTrafficLatencyReport(windowHours, routes),
    refetchInterval: options?.live ? 5_000 : false,
    placeholderData: keepPreviousData,
  });
}
