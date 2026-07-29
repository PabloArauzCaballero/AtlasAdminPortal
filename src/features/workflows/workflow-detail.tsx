"use client";

import { Badge } from "@/shared/components/ui/badges";
import type { WorkflowStage, WorkflowTransition, WorkflowTree } from "./types";
import { CONDITION_LABEL } from "./workflow-edges";
import {
  DetailField,
  DetailList,
  describeCompletionRule,
} from "./workflow-detail-primitives";
import { WorkflowStepDetail } from "./workflow-step-detail";
import { ACTOR_LABEL } from "./workflow-node";
import type { WorkflowSelection } from "./workflow-graph-helpers";

/**
 * Panel lateral del lienzo: traduce a lenguaje de negocio lo que el catálogo
 * declara del elemento seleccionado. El dibujo enseña la forma del proceso;
 * esta ficha, la regla que hay detrás.
 */
export function WorkflowDetail({
  tree,
  selection,
}: Readonly<{ tree: WorkflowTree; selection: WorkflowSelection }>) {
  if (!selection) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-xs leading-5 text-atlas-muted">
        Pulsa una etapa, un paso o una flecha del flujo para ver qué declara el
        catálogo: quién lo ejecuta, en qué estado del cliente, de qué depende y
        qué deja para los siguientes.
      </p>
    );
  }

  const body =
    selection.kind === "transition"
      ? renderTransition(tree, selection.code)
      : selection.kind === "stage"
        ? renderStage(tree, selection.code)
        : renderStep(tree, selection.code);

  return (
    <div className="space-y-3 rounded-2xl border border-atlas-border bg-white p-4 shadow-subtle">
      {body}
    </div>
  );
}

function renderStage(tree: WorkflowTree, code: string) {
  const stage = findStage(tree.stages, code);
  if (!stage) return <NotFound />;
  const stepCount = countSteps(stage);
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          Etapa del flujo
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-atlas-text">
          {stage.name}
        </h3>
        <p className="mt-1 font-mono text-xs text-atlas-muted">
          {stage.stageCode}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{stage.moduleCode}</Badge>
        <Badge tone="info">
          {ACTOR_LABEL[stage.actorType] ?? stage.actorType}
        </Badge>
        <Badge tone="muted">orden {stage.displayOrder}</Badge>
        {stage.isOptional ? <Badge tone="warning">opcional</Badge> : null}
        {stage.isEntryStage ? <Badge tone="success">entrada</Badge> : null}
        {stage.isTerminalStage ? <Badge tone="critical">terminal</Badge> : null}
      </div>
      {stage.description ? (
        <p className="text-xs leading-5 text-atlas-muted">
          {stage.description}
        </p>
      ) : null}
      <DetailField
        label="Cuándo se da por completada"
        value={describeCompletionRule(stage.completionRule)}
      />
      <DetailList
        title="Estados requeridos"
        items={stage.requiredStates}
        empty="No exige un estado concreto del cliente."
      />
      <DetailList
        title="Estados que deja"
        items={stage.resultingStates}
        empty="No cambia el estado del cliente."
      />
      <DetailList
        title="Roles autorizados"
        items={stage.allowedRoles}
        empty="Sin restricción de rol declarada."
      />
      <p className="text-xs text-atlas-muted">
        {stepCount} paso(s) · {stage.subStages.length} subetapa(s)
      </p>
    </div>
  );
}

function renderStep(tree: WorkflowTree, code: string) {
  const step = flatten(tree.stages).find((item) => item.stepCode === code);
  if (!step) return <NotFound />;
  return <WorkflowStepDetail step={step} />;
}

function renderTransition(tree: WorkflowTree, code: string) {
  const transition = tree.transitions.find(
    (item) => item.transitionCode === code,
  );
  if (!transition) return <NotFound />;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          Transición
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-atlas-text">
          {transition.description ?? transition.transitionCode}
        </h3>
        <p className="mt-1 font-mono text-xs text-atlas-muted">
          {transition.fromStepCode ?? "entrada del flujo"} →{" "}
          {transition.toStepCode ?? "salida del flujo"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={toneForCondition(transition)}>
          {CONDITION_LABEL[transition.conditionType] ??
            transition.conditionType}
        </Badge>
        {transition.isDefaultPath ? (
          <Badge tone="info">camino principal</Badge>
        ) : (
          <Badge tone="muted">rama alternativa</Badge>
        )}
      </div>
      {Object.keys(transition.conditionExpression).length > 0 ? (
        <DetailField
          label="Condición declarada"
          value={JSON.stringify(transition.conditionExpression)}
          mono
        />
      ) : null}
    </div>
  );
}

function toneForCondition(transition: WorkflowTransition) {
  if (transition.conditionType === "on_error") return "critical" as const;
  if (transition.conditionType === "on_success") return "success" as const;
  if (transition.conditionType === "conditional") return "warning" as const;
  return "default" as const;
}

function NotFound() {
  return (
    <p className="text-xs text-atlas-muted">
      Ese elemento no está en la versión o el filtro que estás viendo.
    </p>
  );
}

function findStage(
  stages: readonly WorkflowStage[],
  code: string,
): WorkflowStage | undefined {
  for (const stage of stages) {
    if (stage.stageCode === code) return stage;
    const found = findStage(stage.subStages, code);
    if (found) return found;
  }
  return undefined;
}

function countSteps(stage: WorkflowStage): number {
  return (
    stage.steps.length +
    stage.subStages.reduce((total, sub) => total + countSteps(sub), 0)
  );
}

function flatten(stages: readonly WorkflowStage[]): WorkflowStage["steps"] {
  return stages.flatMap((stage) => [
    ...stage.steps,
    ...flatten(stage.subStages),
  ]);
}
