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
 * Alta de usuario interno: UNA sola llamada a `POST /internal/auth/signup`.
 *
 * Estaba rota de raíz. El portal mandaba sólo `email`, `password`, `fullName`, `department` y
 * `jobTitle`, y `createInternalUserSchema` del backend exige además `roles` (mínimo uno) y `reason`
 * (mínimo ocho caracteres). El alta respondía SIEMPRE 400 «Entrada inválida en body.»: dar de alta
 * a alguien desde el portal no funcionaba en ningún caso, y el formulario ya pedía los dos campos
 * que faltaban —se rellenaban y se tiraban.
 *
 * Con el contrato completo desaparecen también las dos llamadas de después (asignar roles y forzar
 * el cambio de contraseña) y con ellas los `warnings` de «la cuenta se creó a medias»: el backend
 * crea la cuenta, le asigna los roles y marca `mustChangePassword` en la misma transacción, así que
 * o existe entera o no existe. Un alta a medias no era un riesgo teórico: dejaba una cuenta sin
 * permisos, con una contraseña que sólo vivía en la memoria de esa pestaña, y con el correo ya
 * tomado para volver a intentarlo.
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
      ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
      roles: input.roles,
      reason: input.reason,
      // Explícito aunque el backend ya lo tenga por defecto: la contraseña temporal la generó este
      // navegador y no debe sobrevivir al primer login.
      mustChangePassword: true,
    },
  });
  const user = "user" in signupResult ? signupResult.user : signupResult;

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
