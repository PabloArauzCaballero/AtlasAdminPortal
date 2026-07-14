"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  createInternalUser,
  getInternalRole,
  getInternalUser,
  listInternalPermissions,
  listInternalRoles,
  listInternalUsers,
  updateInternalUser,
  updateInternalUserRoles,
} from "./services";
import type { CreateInternalUserInput, UpdateInternalUserInput } from "./types";

export function useInternalUsers(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalUsers(query),
    queryFn: () => listInternalUsers(query),
  });
}

export function useUpdateInternalUserRolesMutation(internalUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roles: string[]) =>
      updateInternalUserRoles(internalUserId, roles),
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
