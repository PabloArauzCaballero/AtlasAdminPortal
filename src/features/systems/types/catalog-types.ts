import type { JsonRecord } from "@/shared/api/types";

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
  isWorker?: boolean;
  isConfigured?: boolean;
  missingEnvVars?: string[];
  /** Estado vivo: true = operativa, false = caída, null = sin chequeo en vivo (config o no-aplica). */
  isHealthy?: boolean | null;
  healthMessage?: string | null;
  checkType?: "LIVE" | "CONFIGURATION" | "NOT_APPLICABLE" | string;
  [key: string]: unknown;
};

export type Domain = {
  domainId: string;
  domainCode: string;
  domainName: string;
  description: string;
  businessDefinition: string;
  technicalScope: string;
  dataNature: string;
  ownerTeam: string;
  countriesApplicable: string[];
  regulatoryNotes: string | null;
  exampleTables: string[];
  decisionUseCases: string[];
  auditRelevance: string | null;
  status: string;
};

export type EndpointItem = {
  endpointId: string;
  code: string;
  module: string;
  /** Bloque del ecosistema (PRODUCTO) que expone el endpoint; `backendService` es el PROCESO. */
  systemCode?: string;
  /** Backend/servicio dueño del endpoint (ej. atlas-backend); soporta catálogos multi-backend. */
  backendService?: string;
  backendBaseUrl?: string | null;
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

/**
 * Las entidades de datos, las herramientas y el mapa de dominios viven en `catalog-data-types`:
 * juntos pasaban de las 300 líneas que `yarn max-lines` admite. Se re-exportan aquí para que
 * `import … from "@/features/systems/types/catalog-types"` siga siendo la puerta de entrada.
 */
export * from "./catalog-data-types";
