"use client";

import { useQuery } from "@tanstack/react-query";
import { isAtlasApiError } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query-keys";
import { getProviderAuthState } from "./services";

/** «El broker no tiene credencial para este proveedor»: una respuesta, no una caída. */
export function isNotFound(error: unknown): boolean {
  return isAtlasApiError(error) && error.status === 404;
}

/**
 * Estado de autenticación de UN proveedor. Un 404 no se reintenta; cualquier otro fallo, dos
 * veces, como el resto de lecturas del portal.
 */
export function useProviderAuthState(providerCode: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.externalProviderAuthState(providerCode),
    queryFn: () => getProviderAuthState(providerCode),
    enabled: enabled && Boolean(providerCode),
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
}
