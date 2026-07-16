import { refreshInternalSession } from "./refresh-session";
import type { InternalSession } from "@/shared/auth/types";

/**
 * Refresh en vuelo compartido. Sin esto, N peticiones que reciben 401 a la vez
 * disparan N refresh en paralelo: el backend rota el refresh token, las
 * respuestas se pisan entre sí y la sesión puede quedar inconsistente.
 */
let inFlight: Promise<InternalSession | null> | null = null;

/**
 * Devuelve el refresh en curso si ya hay uno; si no, arranca uno nuevo.
 * Todas las peticiones concurrentes esperan la misma promesa (single-flight).
 */
export function coordinateSessionRefresh(
  session: InternalSession | null,
): Promise<InternalSession | null> {
  inFlight ??= refreshInternalSession(session).finally(() => {
    // Se limpia siempre, también si el refresh falló: el próximo 401 debe poder
    // intentarlo de nuevo en vez de quedar servido por una promesa rechazada.
    inFlight = null;
  });

  return inFlight;
}

/** Descarta el refresh en vuelo. Pensado para aislar tests entre sí. */
export function resetRefreshCoordinator(): void {
  inFlight = null;
}
