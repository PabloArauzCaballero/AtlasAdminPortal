"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";
import { useWorkflowTree, useWorkflowVersions, useWorkflows } from "./hooks";
import {
  WorkflowControls,
  WorkflowLegend,
  WorkflowTotals,
} from "./workflow-controls";
import { WorkflowConsistencyPanel } from "./workflow-consistency";
import { WorkflowDetail } from "./workflow-detail";
import { WorkflowGraphView } from "./workflow-graph-view";
import type { WorkflowSelection } from "./workflow-graph-helpers";
import type { WorkflowStage, WorkflowTree, WorkflowTreeQuery } from "./types";

const STANDARD_WORKFLOW = "customer_credit_journey";

/**
 * Vista del recorrido: el árbol de decisión del proceso, tal como lo declara el
 * catálogo de flujos del backend (`/api/v1/workflows`).
 *
 * El lienzo manda: ocupa todo el ancho y la ficha del elemento seleccionado se
 * abre FLOTANDO encima. Cuando la ficha era una columna del grid, el grafo
 * quedaba encajonado y no se veían ni tres etapas seguidas.
 */
export function WorkflowCanvas() {
  const [workflowCode, setWorkflowCode] = useState(STANDARD_WORKFLOW);
  const [filters, setFilters] = useState<WorkflowTreeQuery>({
    version: "latest",
  });
  const [selection, setSelection] = useState<WorkflowSelection>(null);
  const [showDependencies, setShowDependencies] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const workflows = useWorkflows();
  const versions = useWorkflowVersions(workflowCode);
  const tree = useWorkflowTree(workflowCode, filters);

  const modules = useMemo(
    () => (tree.data ? collectModules(tree.data.stages) : []),
    [tree.data],
  );

  // En pantalla completa, Escape sale: es lo que espera cualquiera que haya
  // entrado sin fijarse en el botón.
  useEffect(() => {
    if (!expanded) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

  const controls = (
    <div data-tutorial-id="workflow-controls">
      <WorkflowControls
        workflows={workflows.data ?? []}
        workflowCode={workflowCode}
        versions={versions.data ?? []}
        filters={filters}
        modules={modules}
        showDependencies={showDependencies}
        onShowDependenciesChange={setShowDependencies}
        onWorkflowChange={(code) => {
          setWorkflowCode(code);
          setFilters({ version: "latest" });
          setSelection(null);
        }}
        onFiltersChange={(next) => {
          setFilters(next);
          setSelection(null);
        }}
      />
    </div>
  );

  const body = (
    <WorkflowBody
      tree={tree}
      selection={selection}
      showDependencies={showDependencies}
      expanded={expanded}
      onSelect={setSelection}
      onToggleExpanded={() => setExpanded((value) => !value)}
    />
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-atlas-soft p-4">
        {controls}
        <div className="min-h-0 flex-1">{body}</div>
      </div>
    );
  }

  return (
    <div data-tutorial-id="workflow-canvas">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Árbol de decisión del recorrido"
            description="El proceso estándar tal como lo declara el backend: en qué orden se recorren los endpoints, bajo qué condición se pasa de uno al siguiente y qué estado del cliente habilita cada paso."
            className="mb-0"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {controls}
          {body}
          {/* La deriva entre lo declarado y lo montado se comprueba aquí, junto al árbol que la
              declara: en otra pantalla habría que recordar qué flujo se estaba mirando. */}
          <WorkflowConsistencyPanel workflowCode={workflowCode} version={filters.version} />
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowBody({
  tree,
  selection,
  showDependencies,
  expanded,
  onSelect,
  onToggleExpanded,
}: Readonly<{
  tree: ReturnType<typeof useWorkflowTree>;
  selection: WorkflowSelection;
  showDependencies: boolean;
  expanded: boolean;
  onSelect: (selection: WorkflowSelection) => void;
  onToggleExpanded: () => void;
}>) {
  if (tree.isLoading) return <LoadingSkeleton rows={6} />;
  if (tree.error) {
    return (
      <ErrorState
        title="No se pudo leer el catálogo de flujos"
        description={
          isAtlasApiError(tree.error)
            ? tree.error.message
            : "El backend no devolvió el flujo. Comprueba que el catálogo esté sembrado (yarn db:seed:prod) y que la versión del backend incluya /workflows."
        }
        requestId={
          isAtlasApiError(tree.error) ? tree.error.requestId : undefined
        }
        onRetry={() => void tree.refetch()}
      />
    );
  }
  if (!tree.data) return null;
  if (tree.data.stages.length === 0) {
    return (
      <ErrorState
        title="El filtro dejó el flujo vacío"
        description="Ninguna etapa cumple los filtros seleccionados. Quita alguno para volver a ver el recorrido."
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", expanded && "h-full min-h-0")}>
      {expanded ? null : <WorkflowTotals tree={tree.data} />}
      <div className={cn("relative", expanded && "min-h-0 flex-1")}>
        <WorkflowGraphView
          tree={tree.data}
          selection={selection}
          showDependencies={showDependencies}
          expanded={expanded}
          onSelect={(next) =>
            onSelect(
              selection &&
                next &&
                selection.kind === next.kind &&
                selection.code === next.code
                ? null
                : next,
            )
          }
          onToggleExpanded={onToggleExpanded}
        />
        <SidePanel
          tree={tree.data}
          selection={selection}
          onClose={() => onSelect(null)}
        />
        {/* Abajo al centro: es la única banda del lienzo que no tapa nodos ni
            pisa el minimapa o los controles de zoom. */}
        {selection ? null : (
          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-atlas-border bg-white/90 px-3 py-1.5 text-[0.6875rem] text-atlas-muted shadow-subtle">
            Pasa el ratón por un nodo para ver su detalle; púlsalo para abrir su
            ficha y probarlo.
          </p>
        )}
      </div>
    </div>
  );
}

/** Ficha y leyenda flotando sobre el lienzo, sin robarle ancho. */
function SidePanel({
  tree,
  selection,
  onClose,
}: Readonly<{
  tree: WorkflowTree;
  selection: WorkflowSelection;
  onClose: () => void;
}>) {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-y-3 right-3 flex w-[21rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 overflow-hidden">
      <div className="pointer-events-auto flex justify-end">
        <button
          type="button"
          onClick={() => setLegendOpen((open) => !open)}
          aria-expanded={legendOpen}
          className="rounded-lg border border-atlas-border bg-white/95 px-3 py-1.5 text-xs font-medium text-atlas-text shadow-subtle hover:bg-atlas-soft"
        >
          {legendOpen ? "Ocultar leyenda" : "Cómo leer el flujo"}
        </button>
      </div>

      {legendOpen ? (
        <div
          data-tutorial-id="workflow-legend"
          className="pointer-events-auto rounded-2xl border border-atlas-border bg-white/97 p-3 shadow-lg backdrop-blur"
        >
          <WorkflowLegend />
        </div>
      ) : null}

      {selection ? (
        <div
          data-tutorial-id="workflow-detail"
          className="atlas-scrollbar pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-2xl border border-atlas-border bg-white/97 shadow-lg backdrop-blur"
        >
          <div className="sticky top-0 z-10 flex justify-end bg-white/90 p-2 backdrop-blur">
            <button
              type="button"
              aria-label="Cerrar la ficha"
              onClick={onClose}
              className="rounded-md p-1 text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-4">
            <WorkflowDetail tree={tree} selection={selection} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function collectModules(stages: readonly WorkflowStage[]): string[] {
  const modules = new Set<string>();
  const visit = (stage: WorkflowStage) => {
    modules.add(stage.moduleCode);
    stage.subStages.forEach(visit);
  };
  stages.forEach(visit);
  return [...modules].sort((a, b) => a.localeCompare(b));
}
