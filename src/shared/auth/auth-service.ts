import { apiRequest } from "@/shared/api/client";
import type {
  InternalAccessProfile,
  InternalAuthResponse,
  InternalSession,
  LoginInput,
} from "./types";
import { normalizeInternalSession } from "./auth-normalizers";

export async function loginInternal(
  input: LoginInput,
): Promise<InternalSession> {
  const payload = await apiRequest<InternalAuthResponse>(
    "/internal/auth/login",
    {
      method: "POST",
      body: input,
      tenantId: input.tenantId,
      skipAuth: true,
    },
  );
  return normalizeInternalSession(payload);
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
