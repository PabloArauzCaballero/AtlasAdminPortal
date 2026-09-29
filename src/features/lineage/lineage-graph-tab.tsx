"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, TableProperties } from "lucide-react";
import { useLineageGraph } from "@/features/lineage-official/hooks";
import {
  buildLineageEdgeColumns,
  buildLineageNodeColumns,
} from "@/features/lineage-official/lineage-columns";
import { LineageGraphView } from "@/features/lineage-official/lineage-graph-view";
import type { LineageGraphSummary } from "@/features/lineage-official/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { NODE_TYPE_OPTIONS, useModuleOptions } from "./module-options";

type ViewMode = "table" | "graph";

/**
 * El grafo. Buscador, módulo y tipo de nodo viajan al servidor: el filtro de módulo antes se
 * aplicaba en el navegador sobre los nodos recibidos y sus opciones salían de esos mismos nodos.
 */
export function LineageGraphTab() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [nodeType, setNodeType] = useState(searchParams.get("nodeType") ?? "");
  const [domain, setDomain] = useState(searchParams.get("domain") ?? "");
  const [view, setView] = useState<ViewMode>("graph");
  const graph = useLineageGraph({ q, nodeType, domain });
  const modules = useModuleOptions();
  const nodes = useMemo(() => graph.data?.nodes ?? [], [graph.data?.nodes]);
  const edges = useMemo(() => graph.data?.edges ?? [], [graph.data?.edges]);
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.nodeId, node])),
    [nodes],
  );
  const nodeColumns = useMemo(() => buildLineageNodeColumns(), []);
  const edgeColumns = useMemo(
    () => buildLineageEdgeColumns(nodesById),
    [nodesById],
  );
  const summary = graph.data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewModeToggle view={view} onChange={setView} />
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, esquema, ruta, nombre de ruta o módulo…"
        searchTooltip="Busca en el servidor por nombre de tabla o entidad, esquema, ruta, nombre de ruta y módulo."
        filters={[
          {
            name: "domain",
            label: "Módulo",
            value: domain,
            options: modules.options,
            tooltip:
              "Sólo nodos de este módulo. La lista sale del mapa de dominios del catálogo completo.",
          },
          {
            name: "nodeType",
            label: "Tipo de nodo",
            value: nodeType,
            options: NODE_TYPE_OPTIONS,
            tooltip: "Enseña sólo tablas o sólo rutas.",
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
              : "No se pudo cargar el grafo de linaje."
          }
          requestId={
            isAtlasApiError(graph.error) ? graph.error.requestId : undefined
          }
          onRetry={() => void graph.refetch()}
        />
      ) : null}
      {graph.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Nodos en el grafo"
              value={formatNumber(nodes.length)}
            />
            <MetricCard
              label="Endpoint → tabla"
              value={formatNumber(summary?.impactEdges?.shown ?? 0)}
              hint={
                summary?.impactEdges
                  ? `${formatNumber(summary.impactEdges.total)} en el catálogo`
                  : undefined
              }
            />
            <MetricCard
              label="Tabla → tabla"
              value={formatNumber(summary?.relationshipEdges?.shown ?? 0)}
              hint={
                summary?.relationshipEdges
                  ? `${formatNumber(summary.relationshipEdges.total)} en el catálogo`
                  : undefined
              }
            />
            <MetricCard
              label="Generado"
              value={formatDateTime(graph.data.generatedAt)}
            />
          </section>
          <CoverageNote summary={summary} />
          {view === "graph" ? (
            <LineageGraphView nodes={nodes} edges={edges} />
          ) : (
            <>
              <GraphTableCard
                title="Nodos"
                data={nodes}
                columns={nodeColumns}
              />
              <GraphTableCard
                title="Relaciones"
                data={edges}
                columns={edgeColumns}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
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
        aria-pressed={view === "graph"}
        className={cn("h-8 px-2.5", view === "graph" && "bg-atlas-soft")}
        onClick={() => onChange("graph")}
      >
        <LayoutGrid className="h-4 w-4" />
        Grafo
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={view === "table"}
        className={cn("h-8 px-2.5", view === "table" && "bg-atlas-soft")}
        onClick={() => onChange("table")}
      >
        <TableProperties className="h-4 w-4" />
        Tabla
      </Button>
    </div>
  );
}

function GraphTableCard<T>({
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

/**
 * Cuánto se muestra frente a cuánto cumple el filtro, dicho en voz alta: un grafo recortado que no
 * lo dice lleva a concluir que «no hay relaciones» cuando lo que pasa es que no se pidieron.
 */
export function CoverageNote({
  summary,
}: Readonly<{ summary?: LineageGraphSummary | null }>) {
  if (!summary) return null;
  const parts: string[] = [];
  if (summary.tables?.total) {
    parts.push(
      `${formatNumber(summary.tables.shown)} de ${formatNumber(summary.tables.total)} tablas`,
    );
  }
  if (summary.endpoints?.total) {
    parts.push(
      `${formatNumber(summary.endpoints.shown)} de ${formatNumber(summary.endpoints.total)} rutas`,
    );
  }
  const noRelationships = summary.relationshipEdges?.total === 0;
  return (
    <p className="text-xs leading-5 text-atlas-muted" role="status">
      {parts.length
        ? `Se muestran ${parts.join(" y ")} que cumplen el filtro.`
        : "Ningún nodo cumple el filtro."}
      {summary.truncated
        ? " El grafo está recortado: acota con el buscador, el módulo o el tipo de nodo para ver el resto, o usa la pestaña «Nodos», que pagina el catálogo entero."
        : ""}
      {noRelationships
        ? " El catálogo de relaciones entre tablas está vacío, así que no hay aristas tabla → tabla que dibujar."
        : ""}
    </p>
  );
}
