"use client";

import { useMemo, useState } from "react";
import { useLineageGraph } from "./hooks";
import {
  buildLineageEdgeColumns,
  buildLineageNodeColumns,
} from "./lineage-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { uniqueTextOptions } from "@/shared/lib/options";
import { formatDateTime, formatNumber } from "@/shared/lib/format";

export function LineageOfficialPage() {
  const [q, setQ] = useState("");
  const [nodeType, setNodeType] = useState("");
  const graph = useLineageGraph({ q, nodeType });
  const nodes = useMemo(() => graph.data?.nodes ?? [], [graph.data?.nodes]);
  const edges = useMemo(() => graph.data?.edges ?? [], [graph.data?.edges]);
  const nodeColumns = useMemo(() => buildLineageNodeColumns(), []);
  const edgeColumns = useMemo(() => buildLineageEdgeColumns(), []);
  const nodeTypeOptions = useMemo(
    () => uniqueTextOptions(nodes.map((node) => node.nodeType)),
    [nodes],
  );

  return (
    <PermissionGate permissions={["lineage.read"]}>
      <PageHeader
        eyebrow="Fase 8"
        title="Lineage oficial"
        description="Grafo oficial de dependencias provisto por el servicio interno. La vista derivada anterior queda como apoyo operativo."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar nodo, dominio o referencia…"
        filters={[
          {
            name: "nodeType",
            label: "Tipo de nodo",
            value: nodeType,
            options: nodeTypeOptions,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_, value) => setNodeType(value)}
        onClear={() => {
          setQ("");
          setNodeType("");
        }}
      />
      {graph.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {graph.error ? (
        <ErrorState
          description={
            isAtlasApiError(graph.error)
              ? graph.error.message
              : "No se pudo cargar lineage oficial."
          }
          requestId={
            isAtlasApiError(graph.error) ? graph.error.requestId : undefined
          }
          onRetry={() => void graph.refetch()}
        />
      ) : null}
      {graph.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Nodos" value={formatNumber(nodes.length)} />
            <MetricCard label="Relaciones" value={formatNumber(edges.length)} />
            <MetricCard
              label="Tipos de nodo"
              value={formatNumber(nodeTypeOptions.length)}
            />
            <MetricCard
              label="Generado"
              value={formatDateTime(graph.data.generatedAt)}
            />
          </section>
          <LineageCard title="Nodos" data={nodes} columns={nodeColumns} />
          <LineageCard title="Relaciones" data={edges} columns={edgeColumns} />
          <JsonViewer title="Resumen técnico" value={graph.data.summary} />
        </div>
      ) : null}
    </PermissionGate>
  );
}

function LineageCard<T>({
  title,
  data,
  columns,
}: Readonly<{
  title: string;
  data: T[];
  columns: Parameters<typeof DataTable<T>>[0]["columns"];
}>) {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-4 text-sm font-semibold text-atlas-text">{title}</h2>
        <DataTable
          data={data}
          columns={columns}
          emptyTitle="No hay datos para mostrar."
        />
      </CardContent>
    </Card>
  );
}
