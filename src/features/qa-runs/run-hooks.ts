"use client";

import { useCallback, useRef } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { newIdempotencyKey } from "@/shared/api/idempotency";
import {
  cancelQaRun,
  getQaCapabilities,
  getQaCoverage,
  getQaRun,
  getQaSampleInputs,
  getQaTemplate,
  launchQaRun,
  listQaPersonaSteps,
  listQaRunPersonas,
  listQaRuns,
  listQaTemplates,
  preflightQaRun,
} from "./run-api";
import { pollInterval } from "./run-status";
import type { QaDatasetMode, QaRunRequest } from "./types";

const ROOT = ["qa-runs"] as const;

export function useQaCapabilities() {
  return useQuery({
    queryKey: [...ROOT, "capabilities"],
    queryFn: getQaCapabilities,
    staleTime: 15_000,
  });
}

export function useQaTemplates(workflowCode?: string) {
  return useQuery({
    queryKey: [...ROOT, "templates", workflowCode ?? "*"],
    queryFn: () => listQaTemplates(workflowCode),
    staleTime: 30_000,
  });
}

export function useQaTemplate(code?: string, version?: string) {
  return useQuery({
    queryKey: [...ROOT, "template", code, version],
    queryFn: () => getQaTemplate(code as string, version as string),
    enabled: Boolean(code && version),
  });
}

export function useQaCoverage(workflowCode?: string) {
  return useQuery({
    queryKey: [...ROOT, "coverage", workflowCode],
    queryFn: () => getQaCoverage(workflowCode as string),
    enabled: Boolean(workflowCode),
  });
}

export function useQaSampleInputs() {
  return useMutation({
    mutationFn: (input: {
      code: string;
      version: string;
      seed: string;
      count: number;
      datasetMode: QaDatasetMode;
    }) =>
      getQaSampleInputs(input.code, input.version, {
        seed: input.seed,
        count: input.count,
        datasetMode: input.datasetMode,
      }),
  });
}

export function useQaPreflight() {
  return useMutation({
    mutationFn: (body: QaRunRequest) => preflightQaRun(body),
  });
}

/**
 * Lanzar un plan con una clave de idempotencia ESTABLE por intento.
 *
 * La clave nace la primera vez que se lanza un `planId` y se reutiliza mientras el plan sea el
 * mismo: el doble clic, el «Reintentar» tras un corte y el reintento de red del cliente mandan la
 * misma, y el servidor contesta con la misma corrida. Un plan nuevo (otra preparación) es otro
 * intento y lleva clave nueva.
 */
export function useLaunchQaRun() {
  const attempt = useRef<{ planId: string; key: string } | null>(null);
  const keyFor = useCallback((planId: string) => {
    if (attempt.current?.planId !== planId) {
      attempt.current = { planId, key: newIdempotencyKey() };
    }
    return attempt.current.key;
  }, []);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (plan: { planId: string; planHash: string }) =>
      launchQaRun(plan, keyFor(plan.planId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...ROOT, "runs"] });
    },
  });
  return { ...mutation, keyFor };
}

/**
 * Detalle de la corrida con sondeo: cada 2 s, con espera creciente hasta 10 s si fallan las
 * lecturas, y ninguna más cuando la corrida llega a un estado terminal.
 */
export function useQaRun(runId?: string | null) {
  // `fetchFailureCount` vuelve a 0 al empezar cada lectura, así que no sirve para contar errores
  // SEGUIDOS. Se cuentan con `errorUpdateCount` desde la última lectura buena.
  const errorsAtLastSuccess = useRef(0);
  return useQuery({
    queryKey: [...ROOT, "run", runId],
    queryFn: () => getQaRun(runId as string),
    enabled: Boolean(runId),
    retry: 0,
    refetchInterval: (query) => {
      const { dataUpdatedAt, errorUpdatedAt, errorUpdateCount, data } =
        query.state;
      if (dataUpdatedAt >= errorUpdatedAt)
        errorsAtLastSuccess.current = errorUpdateCount;
      return pollInterval(
        data?.status,
        errorUpdateCount - errorsAtLastSuccess.current,
      );
    },
  });
}

export function useQaRuns(
  query: { limit?: number; templateCode?: string; workflowCode?: string } = {},
) {
  return useQuery({
    queryKey: [...ROOT, "runs", query],
    queryFn: () => listQaRuns(query),
  });
}

export function useQaRunPersonas(
  runId: string | null | undefined,
  query: { page: number; limit: number; status?: string },
  live: boolean,
) {
  return useQuery({
    queryKey: [...ROOT, "run", runId, "personas", query],
    queryFn: () => listQaRunPersonas(runId as string, query),
    enabled: Boolean(runId),
    placeholderData: keepPreviousData,
    refetchInterval: live ? 5_000 : false,
  });
}

export function useQaPersonaSteps(
  runId?: string | null,
  personaKey?: string | null,
) {
  return useQuery({
    queryKey: [...ROOT, "run", runId, "persona", personaKey],
    queryFn: () => listQaPersonaSteps(runId as string, personaKey as string),
    enabled: Boolean(runId && personaKey),
  });
}

export function useCancelQaRun(runId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelQaRun(runId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...ROOT, "run", runId] });
    },
  });
}
