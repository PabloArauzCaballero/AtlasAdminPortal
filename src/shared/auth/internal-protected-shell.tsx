"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/shared/components/layout/app-shell";
import { useAuth } from "./auth-context";
import { sanitizeInternalReturnTo } from "./return-to";
import { SessionUnavailable } from "./session-unavailable";
import { FullPageLoader } from "@/shared/components/ui/states";

export function InternalProtectedShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isHydrated, refreshProfile, restoreSessionFromServer } =
    useAuth();
  const refreshedRef = useRef(false);
  const restoredRef = useRef(false);
  /**
   * El perfil no se pudo leer por un motivo que NO es «no estás autorizado»: un 429 del limitador,
   * un 500, la red caída. Antes esto era una promesa rechazada que nadie atrapaba, así que el
   * shell se quedaba en el cargador a pantalla completa indefinidamente y la única salida era
   * recargar a mano. Ahora se cuenta lo que pasó y se ofrece reintentar.
   */
  const [unavailable, setUnavailable] = useState<unknown>(null);
  const isLogin = pathname === "/internal/login";

  const retry = useCallback(() => {
    setUnavailable(null);
    restoredRef.current = false;
    refreshedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isHydrated || isLogin || unavailable) return;

    if (!session && !restoredRef.current) {
      restoredRef.current = true;
      void restoreSessionFromServer()
        .then((restored) => {
          if (!restored) redirectToLogin(pathname, router);
        })
        .catch((error: unknown) => setUnavailable(error));
      return;
    }

    if (!session && restoredRef.current) {
      redirectToLogin(pathname, router);
      return;
    }

    if (session && !refreshedRef.current) {
      refreshedRef.current = true;
      void refreshProfile()
        .then((refreshed) => {
          if (!refreshed) router.replace("/internal/login");
        })
        // Con una sesión ya cargada, un fallo transitorio al REFRESCAR el perfil no debe sacar a
        // nadie de la pantalla que está mirando: se sigue con los permisos que ya se tenían.
        .catch(() => undefined);
    }
  }, [
    isHydrated,
    isLogin,
    pathname,
    refreshProfile,
    restoreSessionFromServer,
    router,
    session,
    unavailable,
  ]);

  if (isLogin) return <>{children}</>;
  if (unavailable && !session) {
    return <SessionUnavailable error={unavailable} onRetry={retry} />;
  }
  if (!isHydrated || !session) return <FullPageLoader />;
  return <AppShell>{children}</AppShell>;
}

function redirectToLogin(
  pathname: string,
  router: ReturnType<typeof useRouter>,
) {
  // Read the query string client-side (this only runs inside an effect) so the
  // shell no longer depends on useSearchParams during render/SSR.
  const query = typeof window !== "undefined" ? window.location.search : "";
  const current = `${pathname}${query}`;
  router.replace(
    `/internal/login?returnTo=${encodeURIComponent(sanitizeInternalReturnTo(current))}`,
  );
}
