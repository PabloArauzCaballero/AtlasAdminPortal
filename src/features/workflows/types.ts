/**
 * Contrato del catálogo de flujos del backend (`/api/v1/workflows`).
 *
 * Espejo de `workflow-catalog.dtos.ts` en AtlasBackend. El portal NO deriva el
 * recorrido por su cuenta: la jerarquía etapa→subetapa→paso y las transiciones
 * entre pasos son dos relaciones distintas que sólo el backend conoce
 * completas, y una segunda implementación aquí se desincronizaría con la
 * primera versión nueva del flujo.
 */

export type WorkflowActorType =
  "customer" | "internal_user" | "system" | "external_provider";

export type WorkflowConditionType =
  "always" | "on_success" | "on_error" | "on_state" | "conditional";

export type WorkflowDependencyType =
  "requires_completion" | "requires_data" | "soft";

export type WorkflowSummary = {
  workflowId: string;
  workflowCode: string;
  version: string;
  name: string;
  description: string | null;
  processType: string;
  ownerDomain: string;
  status: string;
  isDefault: boolean;
  entryStageCode: string | null;
  terminalStageCodes: string[];
  source: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStep = {
  stepId: string;
  stepCode: string;
  name: string;
  description: string | null;
  endpointCode: string;
  httpMethod: string;
  routePath: string;
  executionOrder: number;
  isMandatory: boolean;
  isRepeatable: boolean;
  requiresAuth: boolean;
  requiresIdempotencyKey: boolean;
  isFlowEntry: boolean;
  isFlowExit: boolean;
  allowedRoles: string[];
  requiredStates: string[];
  resultingStates: string[];
  inputContract: Record<string, unknown>;
  outputContract: Record<string, unknown>;
  validationRules: unknown[];
  possibleErrors: unknown[];
  retryStrategy: Record<string, unknown>;
  producesEvents: string[];
  consumesEvents: string[];
  successCriteria: Record<string, unknown>;
  failureCriteria: Record<string, unknown>;
  dependsOn: Array<{
    stepCode: string;
    dependencyType: WorkflowDependencyType | string;
    description: string | null;
  }>;
  previousStepCodes: string[];
  nextStepCodes: string[];
};

export type WorkflowStage = {
  stageId: string;
  stageCode: string;
  parentStageCode: string | null;
  name: string;
  description: string | null;
  moduleCode: string;
  actorType: WorkflowActorType | string;
  displayOrder: number;
  isOptional: boolean;
  isEntryStage: boolean;
  isTerminalStage: boolean;
  allowedRoles: string[];
  requiredStates: string[];
  resultingStates: string[];
  completionRule: Record<string, unknown>;
  steps: WorkflowStep[];
  subStages: WorkflowStage[];
};

export type WorkflowTransition = {
  transitionId: string;
  transitionCode: string;
  fromStepCode: string | null;
  toStepCode: string | null;
  conditionType: WorkflowConditionType | string;
  conditionExpression: Record<string, unknown>;
  description: string | null;
  displayOrder: number;
  isDefaultPath: boolean;
};

export type WorkflowTree = WorkflowSummary & {
  successCriteria: Record<string, unknown>;
  failureCriteria: Record<string, unknown>;
  metadata: Record<string, unknown>;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  totals: {
    stages: number;
    steps: number;
    transitions: number;
    dependencies: number;
  };
};

export type WorkflowGraphNode = {
  id: string;
  type: "stage" | "step";
  code: string;
  label: string;
  parentId: string | null;
  moduleCode: string;
  actorType: WorkflowActorType | string | null;
  order: number;
  isEntry: boolean;
  isExit: boolean;
  isOptional: boolean;
  httpMethod: string | null;
  routePath: string | null;
  allowedRoles: string[];
};

export type WorkflowGraphEdge = {
  id: string;
  type: "transition" | "dependency";
  source: string | null;
  target: string | null;
  label: string;
  conditionType: WorkflowConditionType | string | null;
  conditionExpression: Record<string, unknown> | null;
  isDefaultPath: boolean;
};

export type WorkflowGraph = {
  workflowCode: string;
  version: string;
  status: string;
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
};

/** Filtros del árbol/grafo. Recortan preservando la cadena de ancestros. */
export type WorkflowTreeQuery = {
  version?: string;
  moduleCode?: string;
  role?: string;
  lifecycleStatus?: string;
  actorType?: string;
};

export type WorkflowTransitionCheck = {
  allowed: boolean;
  reasonCode: string;
  message?: string | null;
  fromStepCode?: string | null;
  toStepCode?: string | null;
  unsatisfiedDependencies?: string[];
};
