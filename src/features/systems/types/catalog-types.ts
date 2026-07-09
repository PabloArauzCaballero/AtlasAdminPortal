import type { JsonRecord, PaginatedResponse } from "@/shared/api/types";

export type ReviewStatus =
  "AUTO_DETECTED" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | string;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;

export type SystemsDashboard = {
  counts: Record<string, number>;
  posture: {
    catalogCoverage?: string;
    pendingReviews?: number;
    stressProfilesEnabled?: number;
    [key: string]: unknown;
  };
};

export type ToolHealth = {
  code?: string;
  name?: string;
  status?: string;
  isCritical?: boolean;
  [key: string]: unknown;
};

export type EndpointItem = {
  endpointId: string;
  code: string;
  module: string;
  controllerName: string;
  handlerName: string;
  method: string;
  routePath: string;
  fullPath: string;
  routeName: string | null;
  businessPurpose: string | null;
  businessAction: string | null;
  expectedResponseSummary: string | null;
  expectedStatusCodes: unknown;
  minPayloadSchema: JsonRecord | null;
  queryParamsSchema: JsonRecord | null;
  pathParamsSchema: JsonRecord | null;
  headersSchema: JsonRecord | null;
  requiresAuth: boolean;
  allowedRoles: string[];
  containsPii: boolean;
  piiFields: string[];
  riskLevel: RiskLevel;
  isDestructive: boolean;
  isReadonly: boolean;
  idempotencyRequired: boolean;
  requiresStressTest: boolean;
  requiresIntegrationTest: boolean;
  isTestableFromPortal: boolean;
  testEnvironmentOnly: boolean;
  ownerTeam: string | null;
  status: string;
  version: string | null;
  detectedFrom: string | null;
  confidenceLevel: string | null;
  reviewStatus: ReviewStatus;
  sourceFile: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ToolRequirement = {
  requirementId: string;
  endpointId: string;
  toolId: string;
  usageType: string;
  isRequired: boolean;
  failureImpact: string | null;
  fallbackStrategy: string | null;
  requiresMock: boolean;
  requiresStressTest: boolean;
  notes: string | null;
  detectedFrom: string | null;
  confidenceLevel: string | null;
  reviewStatus: string;
  tool?: { code?: string; name?: string; type?: string | null } | null;
};

export type DataEntityReference = {
  entityId?: string;
  schemaName?: string;
  tableName?: string;
  entityName?: string | null;
};

export type EndpointReference = {
  endpointId?: string;
  method?: string;
  fullPath?: string;
  routePath?: string;
  routeName?: string | null;
  businessPurpose?: string | null;
};

export type DataEntityImpact = {
  impactId: string;
  endpointId: string;
  dataEntityId: string;
  operationType: string;
  impactLevel: string;
  isPrimaryEntity: boolean;
  isTransactional: boolean;
  rollbackRequired: boolean;
  affectsCustomerState: boolean;
  affectsFinancialState: boolean;
  affectsRiskState: boolean;
  affectsLegalState: boolean;
  affectsDeviceState: boolean;
  affectsNotificationState: boolean;
  requiresAuditLog: boolean;
  requiresRegressionTest: boolean;
  requiresStressTest: boolean;
  notes: string | null;
  detectedFrom: string | null;
  confidenceLevel: string | null;
  reviewStatus: ReviewStatus;
  dataEntity?: DataEntityReference | null;
  endpoint?: EndpointReference | null;
};

export type FieldImpact = {
  fieldImpactId: string;
  endpointId: string;
  dataEntityId: string;
  fieldName: string;
  fieldOperation: string;
  isRequiredInput: boolean;
  isGenerated: boolean;
  isSensitive: boolean;
  isMlCandidate: boolean;
  mlFeatureGroup: string | null;
  validationRule: string | null;
  notes: string | null;
  confidenceLevel: string | null;
  reviewStatus: ReviewStatus;
  dataEntity?: DataEntityReference | null;
};

export type EndpointDetail = {
  endpoint: EndpointItem;
  toolRequirements: ToolRequirement[];
  dataEntityImpacts: DataEntityImpact[];
  fieldImpacts: FieldImpact[];
};

export type EndpointImpact = {
  endpoint: EndpointItem;
  tools: ToolRequirement[];
  tables: DataEntityImpact[];
  fields: FieldImpact[];
};

export type DataEntityColumn = {
  columnId?: string;
  columnName: string;
  businessName?: string | null;
  dataType?: string | null;
  isNullable?: boolean | null;
  businessDescription?: string | null;
  technicalDescription?: string | null;
  containsPii?: boolean | null;
  piiType?: string | null;
  containsSensitive?: boolean | null;
  containsFinancial?: boolean | null;
  usedInScoring?: boolean | null;
  usedInMl?: boolean | null;
  validationRule?: string | null;
  description?: string | null;
  allowedValues?: unknown;
  [key: string]: unknown;
};

export type DataEntity = {
  entityId: string;
  schemaName: string;
  tableName: string;
  modelName: string | null;
  entityName: string | null;
  module: string | null;
  businessPurpose: string | null;
  dataOwner: string | null;
  containsPii: boolean;
  containsFinancialData: boolean;
  containsRiskData: boolean;
  containsLegalData: boolean;
  containsDeviceData: boolean;
  containsLocationData: boolean;
  isAuditCritical: boolean;
  isAppendOnly?: boolean | null;
  allowsUpdates?: boolean | null;
  allowsDeletes?: boolean | null;
  allowsHardDeletes?: boolean | null;
  requiresApproval?: boolean | null;
  retentionPolicyCode: string | null;
  status: string;
  detectedFrom: string | null;
  confidenceLevel: string | null;
  reviewStatus: ReviewStatus;
  columns?: DataEntityColumn[];
  governanceConfig?: Record<string, unknown> | null;
};

export type DataEntityMetadataInput = {
  entityName: string;
  businessPurpose: string;
  dataOwner: string;
  module: string;
  retentionPolicyCode: string;
  status: string;
  containsPii: boolean;
  containsFinancialData: boolean;
  containsRiskData: boolean;
  containsLegalData: boolean;
  containsDeviceData: boolean;
  containsLocationData: boolean;
  isAuditCritical: boolean;
  governance: {
    mutationMode: string;
    appendOnly: boolean;
    updatesAllowed: boolean;
    deletesAllowed: boolean;
    hardDeleteAllowed: boolean;
    approvalRequired: boolean;
    notes: string;
  };
};

export type TableImpact = {
  entity: DataEntity;
  endpointImpacts: DataEntityImpact[];
  columns?: DataEntityColumn[];
  governanceConfig?: Record<string, unknown> | null;
};

export type ToolItem = {
  toolId: string;
  code: string;
  name: string;
  type: string | null;
  provider: string | null;
  purpose: string | null;
  requiredEnvVars: string[];
  hasSandbox: boolean;
  healthcheckRoute: string | null;
  requiresCredentials: boolean;
  isCritical: boolean;
  status: string;
  ownerTeam: string | null;
};

export type EndpointListResponse = PaginatedResponse<EndpointItem>;
export type DataEntityListResponse = PaginatedResponse<DataEntity>;
export type ToolListResponse = PaginatedResponse<ToolItem>;
