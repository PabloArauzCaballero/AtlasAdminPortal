"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useWorkflowTree, useWorkflowVersions, useWorkflows } from "./hooks";
import {
  WorkflowControls,
  WorkflowLegend,
  WorkflowTotals,
} from "./workflow-controls";
import { WorkflowDetail } from "./workflow-detail";
import { WorkflowGraphView } from "./workflow-graph-view";
import type { WorkflowSelection } from "./workflow-graph-helpers";
import type { WorkflowStage, WorkflowTreeQuery } from "./types";

const STANDARD_WORKFLOW = "customer_credit_journey";

/**
 * Lienzo del recorrido: el árbol de decisión del proceso, tal como lo declara
 * el catálogo de flujos del backend (`/api/v1/workflows`).
 *
 * No se dibuja un flujo inventado ni derivado del portal: se lee el catálogo
 * versionado —etapas, subetapas, pasos con su endpoint real, transiciones con
 * su condición y dependencias— y se pinta. Si el backend publica una versión
 * nueva del flujo, esta vista la refleja sin tocar código.
 */
export function WorkflowCanvas() {
  const [workflowCode, setWorkflowCode] = useState(STANDARD_WORKFLOW);
  const [filters, setFilters] = useState<WorkflowTreeQuery>({
    version: "latest",
  });
  const [selection, setSelection] = useState<WorkflowSelection>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  const workflows = useWorkflows();
  const versions = useWorkflowVersions(workflowCode);
  const tree = useWorkflowTree(workflowCode, filters);

  const modules = useMemo(
    () => (tree.data ? collectModules(tree.data.stages) : []),
    [tree.data],
  );

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

          <WorkflowBody
            tree={tree}
            selection={selection}
            showDependencies={showDependencies}
            onSelect={setSelection}
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
  onSelect,
}: Readonly<{
  tree: ReturnType<typeof useWorkflowTree>;
  selection: WorkflowSelection;
  showDependencies: boolean;
  onSelect: (selection: WorkflowSelection) => void;
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
    <>
      <WorkflowTotals tree={tree.data} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <WorkflowGraphView
          tree={tree.data}
          selection={selection}
          showDependencies={showDependencies}
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
        />
        <div className="space-y-3">
          <div data-tutorial-id="workflow-detail">
            <WorkflowDetail tree={tree.data} selection={selection} />
          </div>
          <div
            data-tutorial-id="workflow-legend"
            className="rounded-2xl border border-atlas-border bg-white p-3"
          >
            <p className="mb-2 text-xs font-semibold text-atlas-text">
              Cómo leer el flujo
            </p>
            <WorkflowLegend />
          </div>
        </div>
      </div>
    </>
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
