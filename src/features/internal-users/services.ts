import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import {
  normalizePermissionsPayload,
  normalizeRolesPayload,
} from "./normalize";
import type {
  InternalPermissionsListResponse,
  InternalRole,
  InternalRolesListResponse,
  InternalUserProfile,
  InternalUsersListResponse,
} from "./types";

export function listInternalUsers(query?: QueryParams) {
  return apiRequest<InternalUsersListResponse>("/internal/users", { query });
}

export function getInternalUser(internalUserId: string) {
  return apiRequest<InternalUserProfile>(`/internal/users/${internalUserId}`);
}

export async function listInternalRoles(query?: QueryParams) {
  const payload = await apiRequest<unknown>("/internal/roles", { query });
  return normalizeRolesPayload(payload);
}

export function getInternalRole(roleId: string) {
  return apiRequest<InternalRole>(`/internal/roles/${roleId}`);
}

export async function listInternalPermissions(query?: QueryParams) {
  const payload = await apiRequest<unknown>("/internal/permissions", { query });
  return normalizePermissionsPayload(payload);
}

export type InternalRolesResult = InternalRolesListResponse;
export type InternalPermissionsResult = InternalPermissionsListResponse;
