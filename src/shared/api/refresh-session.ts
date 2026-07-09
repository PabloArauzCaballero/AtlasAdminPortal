import { buildRequestInit, buildUrl } from "./request-init";
import { extractData, parseJsonSafely } from "./response";
import { fetchWithTimeout } from "./transport";
import {
  clearStoredInternalSession,
  setStoredInternalSession,
} from "@/shared/auth/session-storage";
import type { InternalSession } from "@/shared/auth/types";

export async function refreshInternalSession(
  session: InternalSession | null,
): Promise<InternalSession | null> {
  const response = await fetchWithTimeout(
    buildUrl("/internal/auth/refresh"),
    buildRequestInit(
      {
        method: "POST",
        body: session?.refreshToken
          ? { refreshToken: session.refreshToken }
          : {},
        skipAuth: !session?.accessToken,
      },
      session,
    ),
  );

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    clearStoredInternalSession();
    return null;
  }

  const refreshed = extractData<InternalSession>(payload);
  setStoredInternalSession(refreshed);
  return refreshed;
}
