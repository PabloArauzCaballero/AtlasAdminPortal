"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToSessionChanges } from "./session-events";
import {
  clearStoredInternalSession,
  getStoredInternalSession,
} from "./session-storage";

const SESSION_CHANNEL = "atlas_internal_session";

/** Solo viaja el tipo de evento: nunca tokens ni datos de usuario. */
type SessionBroadcast = { type: "SESSION_LOGOUT" };

/**
 * Al terminar la sesión purga la cache de TanStack Query y avisa a las demás
 * pestañas.
 *
 * Sin esto, tras un logout la cache conserva usuario, permisos, notificaciones
 * y PII en memoria, y quien entre después los ve servidos desde ahí antes de
 * cualquier refetch. Y sin el aviso entre pestañas, cerrar sesión en una deja
 * las otras operando con datos de la sesión anterior.
 *
 * Vive fuera del AuthProvider porque necesita el QueryClient: se monta dentro
 * del QueryClientProvider.
 */
export function SessionCacheGuard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Se lee antes de suscribirse: getStoredInternalSession() puede limpiar y
    // emitir por su cuenta si encuentra la sesión inválida o expirada.
    let hasSession = getStoredInternalSession() !== null;
    let applyingRemote = false;

    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(SESSION_CHANNEL);

    const unsubscribe = subscribeToSessionChanges((session) => {
      const nextHasSession = session !== null;
      // Solo purga la transición «había sesión -> ya no». Estando deslogueado,
      // cada petición vuelve a emitir null y purgar en cada una sería absurdo.
      const sessionEnded = hasSession && !nextHasSession;
      hasSession = nextHasSession;
      if (!sessionEnded) return;

      void queryClient.cancelQueries();
      queryClient.clear();
      if (!applyingRemote) channel?.postMessage({ type: "SESSION_LOGOUT" });
    });

    if (channel) {
      channel.onmessage = (event: MessageEvent<SessionBroadcast>) => {
        if (event.data?.type !== "SESSION_LOGOUT") return;
        // Marca el origen remoto para no reemitir el aviso y provocar un
        // ping-pong entre pestañas: emitSessionChange es síncrono, así que el
        // listener de arriba ya habrá corrido cuando se libere el flag.
        applyingRemote = true;
        try {
          clearStoredInternalSession();
        } finally {
          applyingRemote = false;
        }
      };
    }

    return () => {
      unsubscribe();
      channel?.close();
    };
  }, [queryClient]);

  return null;
}
