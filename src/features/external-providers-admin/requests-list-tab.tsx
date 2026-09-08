"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { SimpleTable, Td, Tr } from "./audit/report-shell";
import { explainStatus } from "./finding-codes";
import { useProviderRequests } from "./hooks";
import { ReportFilters } from "./report-view";

const PAGINA = 25;

/**
 * Filtros por lo que la gente busca de verdad, no por cada valor posible de la columna.
 *
 * «Con problema» agrupa los cuatro estados de fallo porque nadie entra buscando exactamente un
 * `PROVIDER_AUTH_FAILED`: entra buscando qué salió mal.
 */
const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "FAILED,PROVIDER_UNAVAILABLE,PROVIDER_AUTH_FAILED,RATE_LIMITED", label: "Con problema" },
  { value: "BLOCKED_BY_COST_POLICY,CONSENT_REQUIRED,MANUAL_APPROVAL_REQUIRED", label: "Frenadas por política" },
  { value: "COMPLETED,MOCKED", label: "Con respuesta" },
  { value: "CACHED", label: "Servidas desde caché" },
];

/**
 * El listado de solicitudes.
 *
 * Es lo que faltaba para que esta pantalla tenga sentido: las cuatro acciones de al lado piden un
 * identificador, y hasta ahora la propia pantalla admitía que había que sacarlo «de otra pantalla,
 * de los registros o de un webhook de error». Se copia desde aquí.
 */
export function RequestsListTab() {
  const [providerCode, setProviderCode] = useState("");
  const [responseStatus, setResponseStatus] = useState("");
  const [days, setDays] = useState(7);
  const [offset, setOffset] = useState(0);
  const query = useProviderRequests({
    providerCode: providerCode || undefined,
    responseStatus: responseStatus || undefined,
    days,
    limit: PAGINA,
    offset,
  });

  function filtrar(accion: () => void) {
    accion();
    // Volver a la primera página al cambiar un filtro: quedarse en la página 4 de un resultado
    // que ahora tiene una página muestra una tabla vacía que parece «no hay nada».
    setOffset(0);
  }

  return (
    <div className="space-y-4">
      <ReportFilters>
        <Field label="Proveedor">
          <Input
            value={providerCode}
            onChange={(event) => filtrar(() => setProviderCode(event.target.value.toUpperCase()))}
            placeholder="ej: SEGIP"
            className="w-44 font-mono text-xs"
          />
        </Field>
        <Field label="Cómo acabó">
          <Select
            value={responseStatus}
            onChange={(event) => filtrar(() => setResponseStatus(event.target.value))}
            className="w-56"
          >
            {ESTADOS.map((estado) => (
              <option key={estado.label} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Últimos (días)">
          <Input
            type="number"
            min={1}
            max={90}
            className="w-32"
            value={days}
            onChange={(event) => filtrar(() => setDays(Number(event.target.value) || 7))}
          />
        </Field>
      </ReportFilters>

      {query.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error) ? query.error.message : "No se pudo cargar el listado de solicitudes."
          }
          requestId={isAtlasApiError(query.error) ? query.error.requestId : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <>
          {query.data.requests.length === 0 ? (
            <p className="rounded-xl border border-atlas-border bg-white p-4 text-sm text-atlas-muted shadow-subtle">
              No hay solicitudes que cumplan estos filtros en el período elegido.
            </p>
          ) : (
            <SimpleTable
              headers={["ID", "Cuándo", "Proveedor", "Qué se pidió", "Cliente", "Cómo acabó", "Tardó"]}
              align={{ 6: "right" }}
            >
              {query.data.requests.map((request) => {
                const explicacion = request.responseStatus ? explainStatus(request.responseStatus) : null;
                return (
                  <Tr key={request.requestId}>
                    <Td>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard?.writeText(request.requestId)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-atlas-text hover:text-atlas-accent"
                        title="Copiar el identificador"
                      >
                        {request.requestId}
                        <Copy className="h-3 w-3" aria-hidden />
                      </button>
                    </Td>
                    <Td muted>{formatDateTime(request.requestedAt)}</Td>
                    <Td>{request.providerCode ?? "—"}</Td>
                    <Td muted>{request.requestType ?? "—"}</Td>
                    <Td muted>{request.customerId ?? "—"}</Td>
                    <Td>
                      <Badge tone={explicacion?.tone ?? "default"}>
                        {explicacion?.label ?? request.responseStatus ?? "—"}
                      </Badge>
                      {request.errorMessageSafe ? (
                        <p className="mt-1 text-xs text-atlas-muted">{request.errorMessageSafe}</p>
                      ) : null}
                    </Td>
                    <Td right>{request.latencyMs === null ? "—" : `${formatNumber(request.latencyMs)} ms`}</Td>
                  </Tr>
                );
              })}
            </SimpleTable>
          )}

          <div className="flex items-center justify-between gap-3 text-sm text-atlas-muted">
            <span>
              {query.data.total === 0
                ? "Sin resultados"
                : `${offset + 1}–${Math.min(offset + PAGINA, query.data.total)} de ${formatNumber(query.data.total)}`}
            </span>
            <div className="flex gap-2">
              <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGINA))}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Anteriores
              </Button>
              <Button
                disabled={offset + PAGINA >= query.data.total}
                onClick={() => setOffset(offset + PAGINA)}
              >
                Siguientes
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
