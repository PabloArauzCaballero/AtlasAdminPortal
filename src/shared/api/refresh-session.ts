import { buildRequestInit, buildUrl } from "./request-init";
import { isGatewayResponse, sendWithGatewayRetry } from "./gateway-retry";
import { extractData, parseJsonSafely, toAtlasApiError } from "./response";
import { fetchWithTimeout } from "./transport";
import { normalizeInternalSession } from "@/shared/auth/auth-normalizers";
import {
  clearStoredInternalSession,
  setStoredInternalSession,
} from "@/shared/auth/session-storage";
import type { InternalSession } from "@/shared/auth/types";

export async function refreshInternalSession(
  session: InternalSession | null,
): Promise<InternalSession | null> {
  // Un refresco no se repite: si llegó, el backend ya rotó el token y el viejo
  // no vale. Ni ante la pasarela: el proxy también contesta en texto cuando el
  // backend cortó la conexión después de recibirlo.
  const { response, payload } = await sendWithGatewayRetry(
    async () => {
      const sent = await fetchWithTimeout(
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
      return { response: sent, payload: await parseJsonSafely(sent) };
    },
    { mode: "single" },
  );

  if (!response.ok) {
    // Si contestó la pasarela, el API no rechazó nada: el token de refresco
    // sigue siendo válido. Borrar la sesión aquí mandaba a login a todo el que
    // trabajaba durante un despliegue. Se informa del fallo y se conserva.
    if (isGatewayResponse(response, payload)) {
      throw toAtlasApiError(response, payload);
    }
    clearStoredInternalSession();
    return null;
  }

  // Se normaliza igual que el login: el backend puede devolver permisos/roles
  // como objetos o bajo otra clave, y guardarlos crudos deja la sesión sin
  // permisos utilizables (parseSession la descartaría en el próximo arranque).
  const refreshed = normalizeInternalSession(
    extractData<InternalSession>(payload),
  );
  setStoredInternalSession(refreshed);
  return refreshed;
}
