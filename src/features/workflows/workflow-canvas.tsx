"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";
import { Portal } from "@/shared/components/ui/portal";
import { useWorkflowTree, useWorkflowVersions, useWorkflows } from "./hooks";
import { WorkflowControls, WorkflowTotals } from "./workflow-controls";
import { WorkflowConsistencyPanel } from "./workflow-consistency";
import { SidePanel } from "./workflow-side-panel";
import { WorkflowGraphView } from "./workflow-graph-view";
import type { WorkflowSelection } from "./workflow-graph-helpers";
import type { WorkflowStage, WorkflowTreeQuery } from "./types";

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

  /*
   * A pantalla completa se sale del árbol de la vista, con `createPortal`.
   *
   * Escrito donde se declara, este bloque queda dentro del `<main>` que `AppShell` anima, y ese
   * `animate-fade-in` le da a `main` un contexto de apilamiento propio: por mucho `z-50` que
   * llevara, la barra lateral (`z-30`, fija en la raíz) y la superior (`z-20`) se pintaban ENCIMA
   * del lienzo «a pantalla completa». No lo era: era un lienzo con el menú por delante.
   */
  if (expanded) {
    return (
      <ALoAncho>
        {controls}
        <div className="min-h-0 flex-1">{body}</div>
      </ALoAncho>
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
          <WorkflowConsistencyPanel
            workflowCode={workflowCode}
            version={filters.version}
          />
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

function collectModules(stages: readonly WorkflowStage[]): string[] {
  const modules = new Set<string>();
  const visit = (stage: WorkflowStage) => {
    modules.add(stage.moduleCode);
    stage.subStages.forEach(visit);
  };
  stages.forEach(visit);
  return [...modules].sort((a, b) => a.localeCompare(b));
}

/** El lienzo expandido, montado en `document.body` para que nada de la aplicación lo tape. */
function ALoAncho({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-atlas-soft p-4">
        {children}
      </div>
    </Portal>
  );
}
