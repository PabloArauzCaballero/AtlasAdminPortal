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
  frequency: string | null;
  owner: string | null;
  expectedAction: string | null;
  checkConfig: JsonRecord | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  openIssues: number;
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

export type DataQualityRuleListResponse = PaginatedResponse<DataQualityRule>;
