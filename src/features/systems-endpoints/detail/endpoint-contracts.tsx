"use client";

import type { EndpointItem } from "@/features/systems/types";
import { ContractTable } from "./contract-table";

export function EndpointContracts({
  endpoint,
}: Readonly<{ endpoint: EndpointItem }>) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-atlas-border bg-white p-5 shadow-subtle">
        <h2 className="text-sm font-semibold text-atlas-text">
          Contratos operativos
        </h2>
        <p className="mt-1 text-sm text-atlas-muted">
          Qué datos pide esta operación como mínimo, qué responde, y qué
          parámetros y cabeceras acepta.
        </p>
      </div>
      <div className="space-y-6">
        <ContractTable
          title="Datos mínimos de entrada"
          value={endpoint.minPayloadSchema}
        />
        <ContractTable
          title="Respuesta esperada"
          value={{
            summary: endpoint.expectedResponseSummary,
            statusCodes: endpoint.expectedStatusCodes,
          }}
        />
        <ContractTable
          title="Parámetros de búsqueda"
          value={endpoint.queryParamsSchema}
        />
        <ContractTable
          title="Parámetros de la ruta y cabeceras"
          value={{
            pathParams: endpoint.pathParamsSchema,
            headers: endpoint.headersSchema,
          }}
        />
      </div>
    </div>
  );
}
