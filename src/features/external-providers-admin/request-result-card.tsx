"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { formatNumber } from "@/shared/lib/format";
import { explainStatus } from "./finding-codes";

/**
 * El resultado de una acción sobre una solicitud, en castellano.
 *
 * Hasta ahora la ÚNICA señal de que aprobar, reintentar o probar había funcionado era que
 * aparecía un bloque de JSON negro debajo del botón. Quien no sabe leer ese objeto no sabe si la
 * acción salió bien, y quien sí sabe leerlo tiene que buscar el campo `responseStatus` entre
 * treinta claves.
 *
 * El JSON no se quita, se pliega: para quien depura es la información buena, y esconderla del
 * todo cambiaría un problema por otro.
 */

type Resultado = Record<string, unknown>;

function texto(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function numero(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function Dato({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.08em] text-atlas-muted">
        {label}
      </p>
      <p className="truncate text-sm font-medium tabular-nums text-atlas-text">
        {value}
      </p>
    </div>
  );
}

export function RequestResultCard({
  title,
  result,
}: Readonly<{ title: string; result: Resultado }>) {
  const [abierto, setAbierto] = useState(false);

  // Las respuestas de este módulo anidan de dos formas distintas según el endpoint: unas traen
  // los campos arriba y otras dentro de `request`. Se miran los dos sitios en vez de exigir una
  // forma única, que obligaría a tocar el backend para una mejora de pantalla.
  const anidado = (result.request ?? result.result ?? {}) as Resultado;
  const estado =
    texto(result.responseStatus) ??
    texto(anidado.responseStatus) ??
    texto(result.status);
  const referencia =
    texto(result.providerReference) ?? texto(anidado.providerReference);
  const modo = texto(result.modeUsed) ?? texto(anidado.modeUsed);
  const latencia = numero(result.latencyMs) ?? numero(anidado.latencyMs);
  const requestId =
    texto(result.requestId) ?? texto(anidado.requestId) ?? texto(result.id);
  const explicacion = estado ? explainStatus(estado) : null;
  const malo =
    explicacion?.tone === "critical" || explicacion?.tone === "warning";

  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex items-start gap-2.5">
        {malo ? (
          <TriangleAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            aria-hidden
          />
        ) : (
          <CircleCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-atlas-text">{title}</p>
          <p className="text-sm text-atlas-muted">
            {explicacion?.summary ??
              "La acción se ejecutó. El detalle está en los datos crudos."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-atlas-border pt-3 md:grid-cols-4">
        {estado ? (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.08em] text-atlas-muted">
              Estado
            </p>
            <Badge tone={explicacion?.tone ?? "default"}>
              {explicacion?.label ?? estado}
            </Badge>
          </div>
        ) : null}
        {referencia ? <Dato label="Referencia" value={referencia} /> : null}
        {modo ? <Dato label="Modo usado" value={modo} /> : null}
        {latencia !== null ? (
          <Dato label="Latencia" value={`${formatNumber(latencia)} ms`} />
        ) : null}
        {requestId ? <Dato label="Solicitud" value={requestId} /> : null}
      </div>

      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="flex items-center gap-1.5 text-sm text-atlas-muted hover:text-atlas-text"
      >
        {abierto ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
        {abierto ? "Ocultar datos crudos" : "Ver datos crudos"}
      </button>
      {abierto ? (
        <JsonViewer title="Respuesta completa" value={result} />
      ) : null}
    </div>
  );
}
