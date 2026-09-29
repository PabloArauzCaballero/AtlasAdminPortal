"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  createInternalUser,
  getInternalRole,
  getInternalUser,
  listInternalPermissions,
  listInternalRoles,
  listInternalUsers,
  unlockInternalUser,
  updateInternalUser,
  updateInternalUserRoles,
} from "./services";
import type { CreateInternalUserInput, UpdateInternalUserInput } from "./types";

export function useInternalUsers(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalUsers(query),
    queryFn: () => listInternalUsers(query),
    // Cambiar de página o de filtro no vacía la tabla: sigue la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useUpdateInternalUserRolesMutation(internalUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roles: string[]; reason: string }) =>
      updateInternalUserRoles(internalUserId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.internalUser(internalUserId),
      });
      await queryClient.invalidateQueries({ queryKey: ["internal-users"] });
    },
  });
}

export function useInternalUser(internalUserId: string) {
  return useQuery({
    queryKey: queryKeys.internalUser(internalUserId),
    queryFn: () => getInternalUser(internalUserId),
    enabled: Boolean(internalUserId),
  });
}

export function useUpdateInternalUserMutation(internalUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInternalUserInput) =>
      updateInternalUser(internalUserId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.internalUser(internalUserId),
      });
      await queryClient.invalidateQueries({ queryKey: ["internal-users"] });
    },
  });
}

export function useUnlockInternalUserMutation(internalUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => unlockInternalUser(internalUserId, reason),
    // También si falla: un 409 dice que la ficha estaba vieja (el bloqueo ya había vencido o
    // alguien lo levantó), y releerla es lo que quita el botón.
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.internalUser(internalUserId),
      });
    },
  });
}

export function useCreateInternalUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInternalUserInput) => createInternalUser(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal-users"] });
    },
  });
}

export function useInternalRoles(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalRoles(query),
    queryFn: () => listInternalRoles(query),
  });
}

export function useInternalRole(roleId: string) {
  return useQuery({
    queryKey: queryKeys.internalRole(roleId),
    queryFn: () => getInternalRole(roleId),
    enabled: Boolean(roleId),
  });
}

export function useInternalPermissions(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalPermissions(query),
    queryFn: () => listInternalPermissions(query),
  });
}
