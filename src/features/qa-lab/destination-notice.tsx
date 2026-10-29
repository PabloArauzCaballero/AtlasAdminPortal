"use client";

import { AlertTriangle } from "lucide-react";
import type { EndpointItem } from "@/features/systems/types";
import { normalizeQaBaseRouteKey } from "./base-routes";

/** Rutas base que el portal resuelve contra su propia API (AtlasBackend). */
const PORTAL_OWN_ROUTES = new Set([
  "CONFIGURED_API",
  "ENVIRONMENT_DEFAULT",
  "LOCAL_API_V1",
  "LOCAL_ROOT",
  "STAGING_CONFIGURED",
  "PRODUCTION_READONLY_CONFIGURED",
]);

/**
 * Avisa cuando la operación pertenece a otro servicio y la ruta base elegida es la del propio
 * portal: la petición saldría hacia AtlasBackend, que no tiene esa ruta, y volvería con un 404
 * que parece un defecto del producto (QA 2026-10-29, OBS-30).
 *
 * Nada de esto cambia a dónde se envía ni qué hosts son confiables: sólo dice la verdad antes de
 * enviar. `CUSTOM_HOST` y el simulador de proveedores quedan fuera porque el operador ya eligió.
 */
export function avisoDeDestino(
  endpoint: Pick<EndpointItem, "backendService" | "backendBaseUrl"> | undefined,
  baseRouteKey: string | undefined,
): string | null {
  const servicio = endpoint?.backendService?.trim();
  if (!endpoint || !servicio || servicio === "atlas-backend") return null;
  if (!PORTAL_OWN_ROUTES.has(normalizeQaBaseRouteKey(baseRouteKey)))
    return null;
  const donde = endpoint.backendBaseUrl ? ` (${endpoint.backendBaseUrl})` : "";
  return (
    `Esta operación pertenece a «${servicio}»${donde}, no a la API de este portal. ` +
    "Si la envías con «API de este portal» llegará a AtlasBackend, que no la tiene, y responderá 404. " +
    "Elige «Otra dirección, escrita a mano» con la dirección de ese servicio (debe estar en la lista permitida)."
  );
}

export function DestinationNotice({
  endpoint,
  baseRouteKey,
}: Readonly<{ endpoint?: EndpointItem; baseRouteKey?: string }>) {
  const aviso = avisoDeDestino(endpoint, baseRouteKey);
  if (!aviso) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{aviso}</span>
    </p>
  );
}
