import type { PaginatedResponse } from "@/shared/api/types";

import type {
  DataEntityImpact,
  Domain,
  EndpointItem,
  ReviewStatus,
} from "./catalog-types";

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
  /** Bloque del ecosistema dueño de la tabla: ATLAS_BACKEND, DECISION_ENGINE, ERP_BACKEND. */
  systemCode?: string;
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
  /**
   * Metadata de gobierno que el backend guarda por herramienta. Es opcional en el tipo porque una
   * herramienta sembrada antes de que el backend empezara a devolverla llega sin estos campos, y
   * un portal que asuma su presencia rompería la ficha entera por un texto que falta.
   */
  description?: string | null;
  businessValue?: string | null;
  technicalUsage?: string | null;
  auditNotes?: string | null;
  failureRisks?: string | null;
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
export type DomainListResponse = PaginatedResponse<Domain>;

/**
 * Un dominio del mapa, con sus cifras calculadas en el SERVIDOR (`GET /systems/domains/overview`).
 *
 * Antes las calculaba el navegador cruzando tres listados paginados a 100 filas: con 432 endpoints
 * y 186 tablas el mapa salía truncado sin que nada lo delatara.
 */
export type DomainOverviewItem = {
  domainCode: string;
  domainName: string;
  description: string | null;
  ownerTeam: string | null;
  dataNature: string | null;
  status: string | null;
  tables: number;
  piiTables: number;
  endpoints: number;
  criticalEndpoints: number;
  testSuites: number;
  pendingReview: number;
  modules: string[];
};

export type DomainOverview = {
  generatedAt: string;
  /** `catalog` si la lista salió de la base; `fixtures` si el catálogo estaba vacío y se usaron las fichas en código. */
  domainSource: "catalog" | "fixtures";
  items: DomainOverviewItem[];
  unassigned: {
    tables: number;
    endpoints: number;
    modules: { module: string; tables: number }[];
  };
  totals: { tables: number; endpoints: number; testSuites: number };
};
