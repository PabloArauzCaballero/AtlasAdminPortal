import { isAtlasApiError } from "@/shared/api/errors";

/** Quién cerró la sesión: la persona, o el cierre por inactividad. */
export type LogoutReason = "user" | "idle";

/** Esperas entre intentos. Tres intentos en ~2 s: suficiente para un corte breve de red. */
const RETRY_DELAYS_MS = [400, 1_500];

/**
 * Pide al backend que revoque la sesión, con reintentos (ADM-06, auditoría 2026-10-09).
 *
 * Antes se intentaba UNA vez y el fallo se tragaba: el portal decía «sesión cerrada» con la cookie
 * `HttpOnly` todavía viva. Devuelve `true` si el backend confirmó, o si respondió 401/403 —la
 * sesión ya no valía, que para quien cierra es lo mismo—; `false` si nunca lo confirmó.
 */
export async function revokeOnServer(
  revoke: () => Promise<unknown>,
  delays: readonly number[] = RETRY_DELAYS_MS,
): Promise<boolean> {
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      await revoke();
      return true;
    } catch (error) {
      if (isAtlasApiError(error) && [401, 403].includes(error.status)) {
        return true;
      }
      const delay = delays[attempt];
      if (delay === undefined) return false;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
}
