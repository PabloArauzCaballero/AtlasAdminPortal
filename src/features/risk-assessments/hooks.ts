"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { getRiskAssessment, getRiskAssessmentExplanation } from "./services";

export function useRiskAssessment(runId: string) {
  return useQuery({
    queryKey: queryKeys.riskAssessment(runId),
    queryFn: () => getRiskAssessment(runId),
    enabled: Boolean(runId),
  });
}

/**
 * La explicación devuelve 404 cuando la corrida existe pero todavía no tiene
 * resultado ("Resultado de riesgo no encontrado."). Es un estado esperado, no
 * un fallo: la página lo trata aparte y sigue mostrando el detalle crudo.
 */
export function useRiskAssessmentExplanation(runId: string) {
  return useQuery({
    queryKey: queryKeys.riskAssessmentExplanation(runId),
    queryFn: () => getRiskAssessmentExplanation(runId),
    enabled: Boolean(runId),
  });
}
