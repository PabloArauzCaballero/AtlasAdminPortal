"use client";

import Link from "next/link";
import { isAtlasApiError } from "@/shared/api/errors";
import { ErrorState } from "@/shared/components/ui/states";
import { UserPlus } from "lucide-react";

/**
 * El 403 que hacía parecer rota la pantalla.
 *
 * `internal/support/*` exige DOS cosas: rol interno y perfil de agente vivo en
 * `support.support_agent_profiles`. Un administrador con todos los permisos, sin perfil, recibe
 * `SUPPORT_AGENT_PROFILE_REQUIRED` en cada ruta de esta sección. Sin este bloque, la consola
 * enseñaría una tabla vacía o un «no se pudo cargar» genérico, y quien lo viera buscaría el fallo
 * en los datos o en la red — no en un alta que se hace dos pantallas más allá.
 *
 * La distinción importa igual en el otro sentido: `{ cases: [] }` con 200 SÍ es una cola vacía, y
 * no debe leerse como un problema de permisos.
 *
 * El código de negocio llega en `error.code`: el filtro de excepciones del backend lo saca del
 * cuerpo del `ForbiddenException` y sólo cae al genérico por estado cuando no hay ninguno.
 */
export function AccesoASoporte({
  error,
  onRetry,
}: Readonly<{ error: unknown; onRetry?: () => void }>) {
  if (!isAtlasApiError(error)) {
    return (
      <ErrorState
        description="No se pudo cargar la información de soporte."
        onRetry={onRetry}
      />
    );
  }

  if (error.code === "SUPPORT_AGENT_PROFILE_REQUIRED") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <UserPlus className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              Tu usuario todavía no es agente de soporte
            </h3>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Tener rol interno abre estas rutas, pero atender casos exige
              además un perfil de agente habilitado. No es un fallo de la
              pantalla ni de los datos: la cola existe y no se te muestra hasta
              que alguien te habilite.
            </p>
            <p className="mt-3 text-sm">
              <Link
                href="/internal/support/agents"
                className="font-medium text-amber-900 underline"
              >
                Ir a Soporte · Agentes
              </Link>{" "}
              — un administrador puede habilitarte allí en un paso.
            </p>
            {error.requestId ? (
              <p className="mt-3 font-mono text-xs text-amber-700">
                Request ID: {error.requestId}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorState
      title={
        error.status === 403
          ? "Tu rol no alcanza para esta sección."
          : "No se pudo cargar la información de soporte."
      }
      description={error.message}
      requestId={error.requestId}
      onRetry={error.status === 403 ? undefined : onRetry}
    />
  );
}
