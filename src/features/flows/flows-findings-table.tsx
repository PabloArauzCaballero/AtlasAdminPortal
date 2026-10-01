"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BlockBadge, SeverityBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useFlowFindings } from "./hooks";
import {
  FINDING_KIND_OPTIONS,
  labelFrom,
  RISK_OPTIONS,
  SYSTEM_OPTIONS,
} from "./filter-options";
import type { FlowFinding } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

/** Hallazgos del análisis de Flujos, abiertos por defecto. */
export function FlowsFindingsTable() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [severity, setSeverity] = useState("");
  const [systemCode, setSystemCode] = useState("");
  const findings = useFlowFindings({
    page,
    limit: usePageSize(20),
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
          <span className="text-xs">
            {labelFrom(FINDING_KIND_OPTIONS, row.original.kind)}
          </span>
        ),
      },
      {
        header: "Sistema",
        accessorKey: "systemCode",
        cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
      },
      {
        header: "Dónde",
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
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en la referencia (la ruta), el módulo y el detalle del hallazgo."
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
            tooltip:
              "Deja sólo los hallazgos de esa gravedad. Los críticos frenan la compuerta de documentación.",
            options: RISK_OPTIONS,
          },
          {
            name: "kind",
            label: "Tipo",
            value: kind,
            tooltip:
              "Deja sólo los hallazgos de una clase: escrituras sin protección, contratos desalineados, rutas que nadie llama, pasos de proceso sin pantalla…",
            options: FINDING_KIND_OPTIONS,
          },
          {
            name: "systemCode",
            label: "Sistema",
            value: systemCode,
            tooltip:
              "Deja sólo los hallazgos de ese sistema: núcleo, Motor, ERP o tableros.",
            options: SYSTEM_OPTIONS,
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
          emptyDescription="El análisis no encontró nada con estos filtros, o el mapa de rutas aún no se cargó."
        />
      ) : null}
    </>
  );
}
