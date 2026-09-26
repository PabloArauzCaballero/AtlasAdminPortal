import { apiRequest } from "@/shared/api/client";
import type {
  InternalAccessProfile,
  InternalAuthResponse,
  InternalSession,
  LoginInput,
  LoginOutcome,
  PasswordChangeInput,
  PinChallenge,
} from "./types";
import { isPinChallenge } from "./types";
import { normalizeInternalSession } from "./auth-normalizers";

/**
 * Primer paso del login. Puede terminar en sesión o en desafío de segundo factor, y los dos son
 * un éxito: AtlasBackend exige 2FA a TODO actor interno cuando hay canal de correo configurado.
 */
export async function loginInternal(input: LoginInput): Promise<LoginOutcome> {
  const payload = await apiRequest<InternalAuthResponse | PinChallenge>(
    "/internal/auth/login",
    {
      method: "POST",
      body: input,
      tenantId: input.tenantId,
      skipAuth: true,
    },
  );
  // Un desafío no se normaliza como sesión: no trae usuario ni permisos, y pasarlo por
  // `normalizeInternalSession` produciría una sesión vacía que los gates leerían como "sin
  // permisos" en vez de como "falta el segundo paso".
  if (isPinChallenge(payload as LoginOutcome)) return payload as PinChallenge;
  return normalizeInternalSession(payload as InternalAuthResponse);
}

/** Segundo paso del login: el desafío más el PIN del correo, a cambio de la sesión. */
export async function verifyLoginPinInternal(
  challengeToken: string,
  pin: string,
): Promise<InternalSession> {
  const payload = await apiRequest<InternalAuthResponse>(
    "/internal/auth/login/pin",
    { method: "POST", body: { challengeToken, pin }, skipAuth: true },
  );
  return normalizeInternalSession(payload);
}

/**
 * «Olvidé mi contraseña»: recuperación SIN sesión, en dos pasos.
 *
 * Distinta de `requestPasswordChange`, que exige estar dentro y saber la contraseña actual —justo
 * lo que no tiene quien la olvidó—. Va al plano genérico de AtlasBackend con
 * `actorType: internal_user`; el tenant viaja como en el login, porque sin sesión no hay de dónde
 * deducirlo.
 *
 * La respuesta es idéntica exista o no la cuenta: la pantalla no puede afirmar que un correo esté
 * registrado sin convertirse en un comprobador de quién trabaja aquí.
 *
 * No sustituye al segundo factor: entrar después sigue pidiendo el PIN del correo.
 */
export function requestPasswordReset(input: {
  tenantId: string;
  email: string;
}): Promise<{ requested: boolean }> {
  return apiRequest<{ requested: boolean }>("/auth/password-reset/request", {
    method: "POST",
    body: { actorType: "internal_user", identifier: input.email },
    tenantId: input.tenantId,
    skipAuth: true,
  });
}

export function confirmPasswordReset(input: {
  tenantId: string;
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ passwordChanged: boolean }> {
  return apiRequest<{ passwordChanged: boolean }>(
    "/auth/password-reset/confirm",
    {
      method: "POST",
      body: {
        actorType: "internal_user",
        identifier: input.email,
        code: input.code,
        newPassword: input.newPassword,
      },
      tenantId: input.tenantId,
      skipAuth: true,
    },
  );
}

/**
 * Cambio de contraseña de la cuenta con sesión abierta, en los mismos dos pasos que el login: se
 * valida la contraseña actual y llega un código al correo registrado.
 */
export function requestPasswordChange(
  currentPassword: string,
): Promise<PinChallenge> {
  return apiRequest<PinChallenge>("/auth/password/change/request", {
    method: "POST",
    body: { currentPassword },
  });
}

export function confirmPasswordChange(
  input: PasswordChangeInput,
): Promise<{ passwordChanged: boolean }> {
  return apiRequest<{ passwordChanged: boolean }>(
    "/auth/password/change/confirm",
    { method: "POST", body: input },
  );
}

export function getInternalMe(): Promise<InternalAccessProfile> {
  return apiRequest<InternalAccessProfile>("/internal/auth/me");
}

export async function refreshInternal(
  refreshToken?: string,
): Promise<InternalSession> {
  const payload = await apiRequest<InternalAuthResponse>(
    "/internal/auth/refresh",
    {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
      skipAuth: !refreshToken,
    },
  );
  return normalizeInternalSession(payload);
}

export function logoutInternal(
  refreshToken?: string,
): Promise<{ loggedOut: boolean }> {
  return apiRequest<{ loggedOut: boolean }>("/internal/auth/logout", {
    method: "POST",
    body: refreshToken
      ? { refreshToken, allDevices: false }
      : { allDevices: false },
    skipAuth: !refreshToken,
  });
}
