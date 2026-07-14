import { apiRequest } from "@/shared/api/client";
import type { QueryParams } from "@/shared/api/types";
import {
  normalizePermissionsPayload,
  normalizeRolesPayload,
} from "./normalize";
import { generateTemporaryPassword } from "./temporary-password";
import type {
  CreateInternalUserInput,
  CreateInternalUserResult,
  InternalPermissionsListResponse,
  InternalRole,
  InternalRolesListResponse,
  InternalUserListItem,
  InternalUserProfile,
  InternalUsersListResponse,
  UpdateInternalUserInput,
} from "./types";

export function listInternalUsers(query?: QueryParams) {
  return apiRequest<InternalUsersListResponse>("/internal/users", { query });
}

export function getInternalUser(internalUserId: string) {
  return apiRequest<InternalUserProfile>(`/internal/users/${internalUserId}`);
}

/**
 * El backend no tiene un endpoint dedicado "crear usuario interno": el alta
 * real es POST /internal/auth/signup (ver PENDIENTE_ATLAS en
 * docs/contracts/frontend-backend-contracts.md sobre su DTO exacto), y los
 * roles se asignan aparte con PATCH /internal/users/:id/roles. Encadenamos
 * ambas llamadas y forzamos mustChangePassword para que la contraseña
 * temporal generada acá quede invalidada en el primer login real.
 */
export async function createInternalUser(
  input: CreateInternalUserInput,
): Promise<CreateInternalUserResult> {
  const temporaryPassword = generateTemporaryPassword();
  const signupResult = await apiRequest<
    InternalUserProfile | InternalUserListItem
  >("/internal/auth/signup", {
    method: "POST",
    body: {
      email: input.email,
      password: temporaryPassword,
      fullName: input.fullName,
      department: input.department,
      jobTitle: input.jobTitle,
    },
  });
  const user = "user" in signupResult ? signupResult.user : signupResult;

  if (input.roles.length > 0) {
    await apiRequest(`/internal/users/${user.id}/roles`, {
      method: "PATCH",
      body: { roles: input.roles },
    });
  }

  await updateInternalUser(user.id, {
    mustChangePassword: true,
    reason: input.reason,
  });

  return { user, temporaryPassword };
}

export function updateInternalUser(
  internalUserId: string,
  body: UpdateInternalUserInput,
) {
  return apiRequest<InternalUserProfile>(`/internal/users/${internalUserId}`, {
    method: "PATCH",
    body,
  });
}

export function updateInternalUserRoles(
  internalUserId: string,
  roles: string[],
) {
  return apiRequest<InternalUserProfile>(
    `/internal/users/${internalUserId}/roles`,
    { method: "PATCH", body: { roles } },
  );
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
