"use client";

import { useEffect, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { reportEvent } from "@/shared/observability/reporter";
import { ErrorState, ForbiddenState } from "@/shared/components/ui/states";

/**
 * Boundary de error de segmento: evita la pantalla en blanco cuando algo lanza
 * durante el render. Diferencia tres casos que el usuario vive distinto: sin
 * conexión, sin permisos (403) y fallo genérico (con requestId para soporte).
 */
export default function RouteError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // navigator.onLine solo es fiable en cliente: se lee tras montar para no
    // arriesgar un desajuste de hidratación.
    setIsOffline(!navigator.onLine);
    // Observabilidad (FASE 18): contexto redactado, sin tokens ni PII. El sink
    // por defecto es no-op hasta que se registre uno real.
    reportEvent("route_error", error, { digest: error.digest });
  }, [error]);

  const apiError = isAtlasApiError(error) ? error : null;

  if (apiError?.status === 403) {
    return (
      <div className="p-6">
        <ForbiddenState />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ErrorState
        title={
          isOffline
            ? "Sin conexión con el servicio interno."
            : "Ocurrió un error inesperado en esta sección."
        }
        description={
          isOffline
            ? "Revisa tu conexión y vuelve a intentarlo."
            : (apiError?.message ??
              "Puedes reintentar; si persiste, comparte el Request ID con soporte.")
        }
        requestId={apiError?.requestId ?? error.digest}
        onRetry={reset}
      />
    </div>
  );
}
