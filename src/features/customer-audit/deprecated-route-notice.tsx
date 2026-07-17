"use client";

import { AlertTriangle } from "lucide-react";
import type { CustomerAuditEventType } from "./types";

/**
 * Cartel permanente de la vista deprecada. No se oculta ni se suaviza: quien lea
 * esta tabla tiene que saber que el conteo es aproximado y que el filtro por tipo
 * deja fuera la auditoría operativa.
 */
export function DeprecatedRouteNotice({
  eventType,
}: Readonly<{ eventType: CustomerAuditEventType }>) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Ruta deprecada en el backend
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
        <li>
          El backend marcó esta ruta como deprecada y la va a retirar. Para
          revisar el historial completo usá la pestaña «Feed de auditoría».
        </li>
        <li>
          El total y la cantidad de páginas son aproximados: el backend lee como
          máximo 1000 filas por fuente y recorta en memoria, así que en clientes
          con mucha actividad las páginas profundas quedan incompletas.
        </li>
        {eventType === "all" ? (
          <li>
            Con «Todos» se incluye la auditoría operativa (donde viven los
            eventos de riesgo, bajo el código{" "}
            <span className="font-mono">risk_assessment.created</span>).
          </li>
        ) : (
          <li>
            Al filtrar por un tipo puntual se excluye la auditoría operativa —
            incluidos los eventos de riesgo. Volvé a «Todos» para verlos.
          </li>
        )}
      </ul>
    </div>
  );
}
