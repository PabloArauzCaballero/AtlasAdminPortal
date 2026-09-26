"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BlockBadge, SeverityBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useFlowFindings } from "./hooks";
import { FLOW_RISKS, FLOW_SYSTEMS, type FlowFinding } from "./types";

const KINDS = [
  "UNPROTECTED_WRITE",
  "CONTRACT_DRIFT",
  "JWT_ONLY_NO_ROLE",
  "CLIENT_CALL_UNMATCHED",
  "UNTESTED_WRITE",
  "ORPHAN_ENDPOINT",
  "RBAC_UNRESOLVED",
];

/** Hallazgos de los detectores de Flujos, abiertos por defecto. */
export function FlowsFindingsTable() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [severity, setSeverity] = useState("");
  const [systemCode, setSystemCode] = useState("");
  const findings = useFlowFindings({
    page,
    limit: 20,
    q,
    kind,
    severity,
    systemCode,
  });
  const columns = useMemo<ColumnDef<FlowFinding>[]>(
    () => [
      {
        header: "Severidad",
        accessorKey: "severity",
        cell: ({ row }) => <SeverityBadge value={row.original.severity} />,
      },
      {
        header: "Tipo",
        accessorKey: "kind",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.kind}</span>
        ),
      },
      {
        header: "Bloque",
        accessorKey: "systemCode",
        cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
      },
      {
        header: "Referencia",
        accessorKey: "ref",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ref}</span>
        ),
      },
      { header: "Módulo", accessorKey: "module" },
      {
        header: "Detalle",
        accessorKey: "summary",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.summary}</span>
        ),
      },
    ],
    [],
  );
  const onFilterChange = (name: string, value: string) => {
    if (name === "kind") setKind(value);
    if (name === "severity") setSeverity(value);
    if (name === "systemCode") setSystemCode(value);
    setPage(1);
  };
  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ruta, módulo o detalle…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={onFilterChange}
        onClear={() => {
          setQ("");
          setKind("");
          setSeverity("");
          setSystemCode("");
          setPage(1);
        }}
        filters={[
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: FLOW_RISKS.map((value) => ({ label: value, value })),
          },
          {
            name: "kind",
            label: "Tipo",
            value: kind,
            options: KINDS.map((value) => ({ label: value, value })),
          },
          {
            name: "systemCode",
            label: "Bloque",
            value: systemCode,
            options: FLOW_SYSTEMS.map((value) => ({ label: value, value })),
          },
        ]}
      />
      {findings.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {findings.error ? (
        <ErrorState
          description={
            isAtlasApiError(findings.error)
              ? findings.error.message
              : "No se pudieron cargar los hallazgos."
          }
          requestId={
            isAtlasApiError(findings.error)
              ? findings.error.requestId
              : undefined
          }
          onRetry={() => void findings.refetch()}
        />
      ) : null}
      {findings.data ? (
        <DataTable
          data={findings.data.items}
          columns={columns}
          meta={findings.data.meta}
          onPageChange={setPage}
          emptyTitle="Sin hallazgos abiertos"
          emptyDescription="Los detectores no encontraron nada con estos filtros, o el artefacto de Flujos aún no se cargó."
        />
      ) : null}
    </>
  );
}
