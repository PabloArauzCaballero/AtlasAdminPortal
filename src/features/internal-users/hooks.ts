"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getInternalRole,
  getInternalUser,
  listInternalPermissions,
  listInternalRoles,
  listInternalUsers,
} from "./services";

export function useInternalUsers(query: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.internalUsers(query),
    queryFn: () => listInternalUsers(query),
  });
}

export function useInternalUser(internalUserId: string) {
  return useQuery({
    queryKey: queryKeys.internalUser(internalUserId),
    queryFn: () => getInternalUser(internalUserId),
    enabled: Boolean(internalUserId),
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
