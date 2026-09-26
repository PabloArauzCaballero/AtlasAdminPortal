"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  addInternalNote,
  claimCase,
  claimChannel,
  closeCase,
  createSupportAgent,
  deactivateSupportAgent,
  escalateCase,
  getSupportCase,
  getSupportCaseTimeline,
  getSupportCodes,
  listQueuedChannels,
  listSupportAgents,
  listSupportCases,
  listSupportCategories,
  listSupportQueues,
  resolveCase,
  setPresence,
  transferCase,
  triageCase,
} from "./services";
import type {
  AssignInput,
  CloseInput,
  CreateAgentInput,
  EscalateInput,
  ResolveInput,
  TriageInput,
} from "./types";

export function useSupportCases(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.supportCases(query),
    queryFn: () => listSupportCases(query),
  });
}

export function useSupportCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.supportCase(caseId),
    queryFn: () => getSupportCase(caseId),
    enabled: Boolean(caseId),
  });
}

export function useSupportCaseTimeline(caseId: string) {
  return useQuery({
    queryKey: queryKeys.supportCaseTimeline(caseId),
    queryFn: () => getSupportCaseTimeline(caseId),
    enabled: Boolean(caseId),
  });
}

/**
 * El catálogo cambia poco y lo piden tres pantallas: se cachea largo.
 *
 * `retry: false` es deliberado. Cuando falta el perfil de agente, estas rutas responden 403 y
 * reintentar sólo retrasa el mensaje que explica qué hacer.
 */
export function useSupportCategories() {
  return useQuery({
    queryKey: queryKeys.supportCategories,
    queryFn: listSupportCategories,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useSupportQueues() {
  return useQuery({
    queryKey: queryKeys.supportQueues,
    queryFn: listSupportQueues,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useSupportCodes() {
  return useQuery({
    queryKey: queryKeys.supportCodes,
    queryFn: getSupportCodes,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

export function useQueuedChannels() {
  return useQuery({
    queryKey: queryKeys.supportDeskQueue,
    queryFn: listQueuedChannels,
    refetchInterval: 30_000,
  });
}

export function useSupportAgents() {
  return useQuery({
    queryKey: queryKeys.supportAgents,
    queryFn: listSupportAgents,
    retry: false,
  });
}

function useAgentsInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["support", "agents"] });
}

export function useCreateSupportAgentMutation() {
  const invalidate = useAgentsInvalidation();
  return useMutation({
    mutationFn: (body: CreateAgentInput) => createSupportAgent(body),
    onSuccess: invalidate,
  });
}

export function useDeactivateSupportAgentMutation() {
  const invalidate = useAgentsInvalidation();
  return useMutation({
    mutationFn: (agentProfileId: string) =>
      deactivateSupportAgent(agentProfileId),
    onSuccess: invalidate,
  });
}

export function useSetPresenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (presenceState: string) => setPresence(presenceState),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "desk"] });
    },
  });
}

export function useClaimChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => claimChannel(channelId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "desk"] });
      await queryClient.invalidateQueries({ queryKey: ["support", "cases"] });
    },
  });
}

/**
 * Toda acción sobre un caso invalida lo mismo: la cola, la ficha y la historia.
 *
 * La historia entra en la lista porque cada una de estas rutas escribe un evento en la cadena de
 * hash del expediente. Dejarla cacheada enseñaría un caso ya resuelto con una historia que no
 * menciona la resolución, y esa pantalla es la que se usa para auditar.
 */
function useCaseActionMutation<TInput, TResult>(
  caseId: string,
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["support", "cases"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.supportCase(caseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.supportCaseTimeline(caseId),
        }),
      ]);
    },
  });
}

export function useTriageCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: TriageInput) =>
    triageCase(caseId, body),
  );
}

export function useClaimCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: AssignInput) =>
    claimCase(caseId, body),
  );
}

export function useTransferCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: AssignInput) =>
    transferCase(caseId, body),
  );
}

export function useEscalateCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: EscalateInput) =>
    escalateCase(caseId, body),
  );
}

export function useInternalNoteMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: string) =>
    addInternalNote(caseId, body),
  );
}

export function useResolveCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: ResolveInput) =>
    resolveCase(caseId, body),
  );
}

export function useCloseCaseMutation(caseId: string) {
  return useCaseActionMutation(caseId, (body: CloseInput) =>
    closeCase(caseId, body),
  );
}
