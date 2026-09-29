"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getStressProfile,
  listStressMatrix,
  listStressProfiles,
  listStressRuns,
  queueStressRun,
  upsertStressProfile,
} from "./services";
import type { QueueStressRunInput, UpsertStressProfileInput } from "./types";

export function useStressProfiles(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressProfiles(query),
    queryFn: () => listStressProfiles(query),
    // Cambiar de página o de filtro no vacía la tabla.
    placeholderData: keepPreviousData,
  });
}

export function useStressProfile(profileId: string) {
  return useQuery({
    queryKey: queryKeys.stressProfile(profileId),
    queryFn: () => getStressProfile(profileId),
    enabled: Boolean(profileId),
  });
}

export function useStressMatrix(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressMatrix(query),
    queryFn: () => listStressMatrix(query),
    // Cambiar de página o de filtro no vacía la tabla.
    placeholderData: keepPreviousData,
  });
}

export function useUpsertStressProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertStressProfileInput) => upsertStressProfile(body),
    // Es un upsert: puede crear un perfil nuevo o sobrescribir uno existente,
    // y en ambos casos cambia la matriz de cobertura (`hasEnabledProfile`) y el
    // detalle del perfil, no solo el listado. Se invalida la raíz de stress.
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "stress-profiles"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["systems", "stress-profile"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["systems", "stress-matrix"],
      });
    },
  });
}

export function useQueueStressRunMutation(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: QueueStressRunInput) => queueStressRun(profileId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "stress-runs"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stressProfile(profileId),
      });
    },
  });
}

export function useStressRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.stressRuns(query),
    queryFn: () => listStressRuns(query),
    // Cambiar de página o de filtro no vacía la tabla.
    placeholderData: keepPreviousData,
  });
}

/**
 * ¿Hay consumidor que ejecute lo que se encola? Core sólo lo arranca con
 * `RUNTIME_JOBS_STRESS_CONSUMER_ENABLED=true`; sin él la corrida se queda en
 * `queued` para siempre. Contra un Core que no expone la ruta, la consulta
 * falla y el portal no afirma nada (`consumerEnabled` queda desconocido).
 */
export type StressRunCapabilities = {
  consumerEnabled: boolean;
  disabledReason: string | null;
};

export function useStressRunCapabilities() {
  return useQuery({
    queryKey: ["systems", "stress-runs", "capabilities"],
    queryFn: () =>
      apiRequest<StressRunCapabilities>("/systems/stress-runs/capabilities"),
    retry: false,
  });
}
