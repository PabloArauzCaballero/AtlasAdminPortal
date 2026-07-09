export const queryKeys = {
  me: ["internal-auth", "me"] as const,
  dashboard: ["systems", "dashboard"] as const,
  toolsHealth: ["systems", "tools-health"] as const,
  endpoints: (params: unknown) => ["systems", "endpoints", params] as const,
  endpoint: (endpointId: string) =>
    ["systems", "endpoint", endpointId] as const,
  endpointImpact: (endpointId: string) =>
    ["systems", "impact-by-endpoint", endpointId] as const,
  dataEntities: (params: unknown) =>
    ["systems", "data-entities", params] as const,
  dataEntity: (entityId: string) =>
    ["systems", "data-entity", entityId] as const,
  tableImpact: (schemaName: string, tableName: string) =>
    ["systems", "impact-by-table", schemaName, tableName] as const,
  testSuites: (params: unknown) => ["systems", "test-suites", params] as const,
  testSuite: (suiteId: string) => ["systems", "test-suite", suiteId] as const,
  testRuns: (params: unknown) => ["systems", "test-runs", params] as const,
  testRun: (runId: string) => ["systems", "test-run", runId] as const,
  actionLogs: (params: unknown) => ["systems", "action-logs", params] as const,
  actionLogsByRequest: (requestId: string) =>
    ["systems", "action-logs-by-request", requestId] as const,
  tools: (params: unknown) => ["systems", "tools", params] as const,
  tool: (toolId: string) => ["systems", "tool", toolId] as const,
  reviewQueue: (params: unknown) =>
    ["systems", "review-queue", params] as const,
  stressProfiles: (params: unknown) =>
    ["systems", "stress-profiles", params] as const,
  stressProfile: (profileId: string) =>
    ["systems", "stress-profile", profileId] as const,
  stressMatrix: (params: unknown) =>
    ["systems", "stress-matrix", params] as const,
  stressRuns: (params: unknown) => ["systems", "stress-runs", params] as const,
  internalUsers: (params: unknown) => ["internal-users", params] as const,
  internalUser: (internalUserId: string) =>
    ["internal-users", internalUserId] as const,
  internalRoles: (params: unknown) => ["internal-roles", params] as const,
  internalRole: (roleId: string) => ["internal-roles", roleId] as const,
  internalPermissions: (params: unknown) =>
    ["internal-permissions", params] as const,
  operationCatalogs: (params: unknown) =>
    ["operations", "catalogs", params] as const,
  definitions: (params: unknown) =>
    ["operations", "definitions", params] as const,
  dataGovernancePolicies: [
    "operations",
    "data-governance",
    "policies",
  ] as const,
  currentRiskPolicy: ["operations", "risk-policy", "current"] as const,
  releaseReadiness: ["internal", "release-readiness"] as const,
  globalSearch: (q: string) => ["internal", "search", q] as const,
  dataQualityIssues: (params: unknown) =>
    ["operations", "data-quality", "issues", params] as const,
  dataQualityRules: (params: unknown) =>
    ["internal", "data-quality", "rules", params] as const,
  dataQualityRule: (ruleId: string) =>
    ["internal", "data-quality", "rule", ruleId] as const,
  reports: (params: unknown) => ["internal", "reports", params] as const,
  report: (reportId: string) => ["internal", "report", reportId] as const,
  reportSnapshots: (reportId: string, params: unknown) =>
    ["internal", "report", reportId, "snapshots", params] as const,
  businessTerms: (params: unknown) =>
    ["internal", "business-metadata", "terms", params] as const,
  businessTerm: (termId: string) =>
    ["internal", "business-metadata", "term", termId] as const,
  governancePolicy: (policyId: string) =>
    ["internal", "governance", "policy", policyId] as const,
  lineageGraph: (params: unknown) =>
    ["internal", "lineage", "graph", params] as const,
  lineageNode: (nodeId: string) =>
    ["internal", "lineage", "node", nodeId] as const,
  lineageImpact: (params: unknown) =>
    ["internal", "lineage", "impact", params] as const,
  jobRuns: (params: unknown) => ["internal", "jobs", params] as const,
  jobRun: (jobRunId: string) => ["internal", "jobs", jobRunId] as const,
  alerts: (params: unknown) => ["internal", "alerts", params] as const,
  dataExports: (params: unknown) => ["internal", "exports", params] as const,
  dataExport: (exportId: string) => ["internal", "exports", exportId] as const,
};
