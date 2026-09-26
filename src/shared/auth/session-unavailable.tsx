"use client";

import { CloudOff, RotateCw, Timer } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";

/**
 * El portal no pudo leer el perfil por un motivo pasajero.
 *
 * Se distingue el 429 del resto porque la acción del operador es distinta y concreta: con el
 * limitador agotado hay que ESPERAR, y decirle «reintenta» sin más lo empuja a pulsar en bucle
 * contra el mismo techo. El resto de fallos sí se reintentan de inmediato.
 */
export function SessionUnavailable({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry: () => void }>) {
  const apiError = isAtlasApiError(error) ? error : null;
  const throttled = apiError?.status === 429;

  return (
    <div className="flex min-h-screen items-center justify-center bg-atlas-mesh p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          {throttled ? (
            <Timer className="h-6 w-6 text-amber-300" aria-hidden />
          ) : (
            <CloudOff className="h-6 w-6 text-rose-300" aria-hidden />
          )}
        </div>
        <h1 className="text-lg font-semibold">
          {throttled
            ? "Demasiadas peticiones al backend"
            : "No se pudo contactar con el servicio interno"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {throttled
            ? "El límite de peticiones por minuto se agotó. Tu sesión sigue siendo válida: espera unos segundos y vuelve a intentarlo."
            : "Tu sesión no se ha cerrado; el portal no consiguió leer tu perfil. Puede ser el backend reiniciándose o un corte de red."}
        </p>
        {apiError?.requestId ? (
          <p className="mt-3 font-mono text-xs text-slate-300">
            Request ID: {apiError.requestId}
          </p>
        ) : null}
        <Button className="mt-5 w-full" variant="secondary" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
