/**
 * Los tipos de la sección Procesos, calcados de `internal/processes` en AtlasBackend
 * (`process-catalog.service.ts`). La fuente de un proceso es su fixture en el código del backend;
 * aquí sólo se lee.
 */

/** Estado de cableado de un paso: una persona lo hace desde un portal; ¿ese portal llama a su ruta? */
export type StepWiring = "wired" | "unwired" | "unknown" | "not_applicable";

export type ProcessDocumentation = {
  narrative: boolean;
  owner: boolean;
  instanceEntity: boolean;
  screens: boolean;
  inDatabase: boolean;
  complete: boolean;
  syncedAt: string | null;
};

export type ProcessWiringSummary = {
  wired: number;
  unwired: number;
  unknown: number;
  personSteps: number;
};

export type ProcessListItem = {
  processId: string;
  code: string;
  name: string;
  description: string;
  processType: string;
  priority: string;
  ownerRole: string;
  systems: string[];
  clients: string[];
  stageCount: number;
  stepCount: number;
  documentation: ProcessDocumentation;
  wiring: ProcessWiringSummary;
  hasInstances: boolean;
};

export type ProcessTotals = {
  processes: number;
  documented: number;
  fullyWired: number;
  unwiredSteps: number;
};

export type ProcessListResponse = {
  totals: ProcessTotals;
  items: ProcessListItem[];
};

export type ProcessNarrative = {
  whyExists: string;
  whoStartsAndCloses: string;
  startAndEnd: string;
  whenItFails: string;
  healthIndicator: string;
};

export type ProcessInstanceEntity = {
  system: string;
  schema: string;
  table: string;
  idColumn: string;
  statusColumn: string;
  labelColumn?: string;
  openStatuses?: string[];
};

export type ProcessStep = {
  code: string;
  name: string;
  description: string;
  kind: "http" | "event" | "job" | "manual" | "external";
  system: string;
  method?: string;
  path?: string;
  job?: string;
  reason?: string;
  optional?: boolean;
  events?: string[];
  wiring: StepWiring;
  flowId: string | null;
  verification: string | null;
  risk: string | null;
  callers: string[];
};

export type ProcessStage = {
  code: string;
  name: string;
  description: string;
  module: string;
  actor: string;
  client: string;
  screen?: string;
  link?: string;
  parent?: string;
  optional?: boolean;
  entry?: boolean;
  terminal?: boolean;
  steps: ProcessStep[];
};

export type ProcessDetail = {
  processId: string;
  code: string;
  version: string;
  name: string;
  description: string;
  processType: string;
  ownerDomain: string;
  ownerRole: string;
  priority: string;
  systems: string[];
  narrative: ProcessNarrative;
  instanceEntity?: ProcessInstanceEntity;
  success: string;
  failure: string;
  sources: string[];
  stages: ProcessStage[];
  documentation: ProcessDocumentation;
  wiring: ProcessWiringSummary;
  codeHash: string;
  databaseHash: string | null;
};

export type ProcessWiringStep = {
  stageCode: string;
  stageName: string;
  client: string;
  screen: string | null;
  stepCode: string;
  stepName: string;
  method?: string;
  path?: string;
  system: string;
  wiring: StepWiring;
  callers: string[];
  flowId: string | null;
};

export type ProcessWiringResponse = {
  code: string;
  summary: ProcessWiringSummary;
  steps: ProcessWiringStep[];
};

export type ProcessInstance = {
  id: string;
  label: string | null;
  status: string;
  open: boolean;
};

export type ProcessInstancesResponse =
  | {
      supported: false;
      reason: string;
      entity: ProcessInstanceEntity | null;
    }
  | {
      supported: true;
      entity: ProcessInstanceEntity;
      byStatus: Array<{ status: string; total: number; open: boolean }>;
      items: ProcessInstance[];
      total: number;
      page: number;
      pageSize: number;
    };

export type InstanceStageState = "current" | "reached" | "unknown";

export type ProcessInstanceProgress = {
  code: string;
  instance: { id: string; label: string | null; status: string };
  stages: Array<{
    code: string;
    name: string;
    actor: string;
    client: string;
    screen: string | null;
    link: string | null;
    state: InstanceStageState;
  }>;
};
