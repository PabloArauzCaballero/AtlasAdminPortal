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
          Esta vista debe salir de la catalogación del backend: payload mínimo,
          respuesta esperada, parámetros y headers. No debe depender de JSON
          crudo visible al cliente.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ContractTable
          title="Payload mínimo"
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
          title="Query params"
          value={endpoint.queryParamsSchema}
        />
        <ContractTable
          title="Path params / headers"
          value={{
            pathParams: endpoint.pathParamsSchema,
            headers: endpoint.headersSchema,
          }}
        />
      </div>
    </div>
  );
}
