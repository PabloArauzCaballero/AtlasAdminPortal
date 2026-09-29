import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type DataQualityRule = {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  description: string | null;
  targetTable: string;
  targetField: string | null;
  ruleType: string;
  severity: string;
  status: string;
  /** Siempre `null`: la tabla no guarda frecuencia ni dueño (antes eran constantes del servicio). */
  frequency: string | null;
  owner: string | null;
  expectedAction: string | null;
  checkConfig: JsonRecord | null;
  /** Cuándo cambió la DEFINICIÓN. Las reglas no se ejecutan: no existe «última ejecución». */
  definitionUpdatedAt: string | null;
  /** Incidencias pendientes (sin revisar o reconocidas) del tenant. */
  openIssues: number;
};

/** Conteos del filtro entero (no de la página), calculados por AtlasBackend. */
export type DataQualityRuleSummary = {
  total: number;
  critical: number;
  active: number;
  pendingIssues: number;
};

export type DataQualityRuleRun = {
  runId: string;
  ruleId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  affectedRows: number | null;
  summary: JsonRecord | null;
};

export type DataQualityRuleListResponse = PaginatedResponse<DataQualityRule> & {
  /** Opcional: un AtlasBackend anterior no lo manda. */
  summary?: DataQualityRuleSummary;
};
