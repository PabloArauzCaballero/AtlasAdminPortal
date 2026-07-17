"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, TableProperties } from "lucide-react";
import { useLineageGraph } from "./hooks";
import {
  buildLineageEdgeColumns,
  buildLineageNodeColumns,
} from "./lineage-columns";
import { LineageGraphView } from "./lineage-graph-view";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";
import { uniqueTextOptions } from "@/shared/lib/options";
import { formatDateTime, formatNumber } from "@/shared/lib/format";

type ViewMode = "table" | "graph";

export function LineageOfficialPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedLineageOfficialPage />
    </PermissionGate>
  );
}

function AuthorizedLineageOfficialPage() {
  const [q, setQ] = useState("");
  const [nodeType, setNodeType] = useState("");
  const [domain, setDomain] = useState("");
  const [view, setView] = useState<ViewMode>("graph");
  const graph = useLineageGraph({ q, nodeType });
  const allNodes = useMemo(() => graph.data?.nodes ?? [], [graph.data?.nodes]);
  const allEdges = useMemo(() => graph.data?.edges ?? [], [graph.data?.edges]);

  // El filtro por dominio/módulo se aplica en cliente y afecta tanto al grafo
  // como a la tabla: enfoca en un módulo sin volver a pedir al backend.
  const nodes = useMemo(
    () =>
      domain
        ? allNodes.filter((node) => (node.domain ?? "Sin dominio") === domain)
        : allNodes,
    [allNodes, domain],
  );
  const edges = useMemo(() => {
    if (!domain) return allEdges;
    const ids = new Set(nodes.map((node) => node.nodeId));
    return allEdges.filter(
      (edge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId),
    );
  }, [allEdges, nodes, domain]);

  const nodesById = useMemo(
    () => new Map(allNodes.map((node) => [node.nodeId, node])),
    [allNodes],
  );
  const nodeColumns = useMemo(() => buildLineageNodeColumns(), []);
  const edgeColumns = useMemo(
    () => buildLineageEdgeColumns(nodesById),
    [nodesById],
  );
  const nodeTypeOptions = useMemo(
    () => uniqueTextOptions(allNodes.map((node) => node.nodeType)),
    [allNodes],
  );
  const domainOptions = useMemo(
    () =>
      uniqueTextOptions(allNodes.map((node) => node.domain ?? "Sin dominio")),
    [allNodes],
  );

  return (
    <>
      <PageHeader
        eyebrow="Linaje oficial"
        title="Lineage oficial"
        description="Grafo oficial de dependencias provisto por el servicio interno. La vista derivada anterior queda como apoyo operativo."
        actions={<ViewModeToggle view={view} onChange={setView} />}
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar nodo, dominio o referencia…"
        filters={[
          {
            name: "domain",
            label: "Dominio / módulo",
            value: domain,
            options: domainOptions,
          },
          {
            name: "nodeType",
            label: "Tipo de nodo",
            value: nodeType,
            options: nodeTypeOptions,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "domain") setDomain(value);
          if (name === "nodeType") setNodeType(value);
        }}
        onClear={() => {
          setQ("");
          setNodeType("");
          setDomain("");
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
          {view === "graph" ? (
            <LineageGraphView nodes={nodes} edges={edges} />
          ) : (
            <>
              <LineageCard title="Nodos" data={nodes} columns={nodeColumns} />
              <LineageCard
                title="Relaciones"
                data={edges}
                columns={edgeColumns}
              />
            </>
          )}
          <JsonViewer title="Resumen técnico" value={graph.data.summary} />
        </div>
      ) : null}
    </>
  );
}

function ViewModeToggle({
  view,
  onChange,
}: Readonly<{ view: ViewMode; onChange: (view: ViewMode) => void }>) {
  return (
    <div className="inline-flex rounded-lg border border-atlas-border bg-white p-0.5">
      <Button
        type="button"
        variant="ghost"
        className={cn("h-8 px-2.5", view === "graph" && "bg-atlas-soft")}
        onClick={() => onChange("graph")}
      >
        <LayoutGrid className="h-4 w-4" />
        Grafo
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn("h-8 px-2.5", view === "table" && "bg-atlas-soft")}
        onClick={() => onChange("table")}
      >
        <TableProperties className="h-4 w-4" />
        Tabla
      </Button>
    </div>
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
