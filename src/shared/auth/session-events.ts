import type { InternalSession } from "./types";

/**
 * Puente entre la capa de sesión (no-React) y el AuthProvider.
 *
 * El refresh silencioso del cliente API escribe la sesión sin pasar por React:
 * sin este canal, `useAuth()` sigue sirviendo los permisos viejos hasta el
 * próximo montaje, y los gates deciden con datos obsoletos.
 */
type SessionListener = (session: InternalSession | null) => void;

const listeners = new Set<SessionListener>();

/** Suscribe un listener y devuelve la función para darse de baja. */
export function subscribeToSessionChanges(
  listener: SessionListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notifica la sesión vigente (o `null` si se limpió). */
export function emitSessionChange(session: InternalSession | null): void {
  for (const listener of [...listeners]) {
    listener(session);
  }
}
