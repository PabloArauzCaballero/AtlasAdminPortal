import type { PaginatedResponse } from "@/shared/api/types";

export type ContextCatalog = {
  catalogId: string;
  catalogCode: string;
  catalogName: string;
  domain: string | null;
  description: string | null;
  ownerTeam: string | null;
  isActive: boolean;
  currentVersion: {
    catalogVersionId: string;
    versionCode: string;
    status: string;
    validFrom: string | null;
    validUntil: string | null;
  } | null;
};
export type CatalogListResponse = { items: ContextCatalog[] };

export type DefinitionListResponse = {
  observations: Array<{
    observationDefinitionId: string;
    observationCode: string;
    observationName: string;
    dataType: string | null;
    sourceGroup: string | null;
    riskDimension: string | null;
    isActive: boolean;
  }>;
  events: Array<{
    eventDefinitionId: string;
    eventCode: string;
    eventName: string;
    eventFamily: string | null;
    sourcePackage: string | null;
    riskDimension: string | null;
    isHighVolume: boolean;
    isActive: boolean;
  }>;
  attributes: Array<{
    attributeDefinitionId: string;
    attributeCode: string;
    attributeName: string;
    entityScope: string | null;
    dataType: string | null;
    riskDimension: string | null;
    isSensitive: boolean;
    isActive: boolean;
  }>;
  features: Array<{
    featureDefinitionId: string;
    featureCode: string;
    featureName: string;
    featureFamily: string | null;
    riskDimension: string | null;
    dataType: string | null;
    isModelInput: boolean;
    isPolicyRuleInput: boolean;
    isActive: boolean;
  }>;
};

export type DataGovernancePolicies = {
  privacyPurposes: Array<{
    purposeId: string;
    purposeCode: string;
    purposeName: string;
    legalBasis: string | null;
    requiresExplicitConsent: boolean;
  }>;
  retentionPolicies: Array<{
    retentionPolicyId: string;
    policyCode: string;
    appliesTo: string;
    retentionDays: number;
    postRetentionAction: string;
    legalBasis: string | null;
  }>;
  dataProviders: Array<{
    dataProviderId: string;
    providerCode: string;
    providerName: string;
    providerType: string;
    reliabilityScore: string | number | null;
    supportsRetroData: boolean;
  }>;
  classificationPolicies: Array<{
    classificationPolicyId: string;
    classificationCode: string;
    classificationName: string;
    sensitivityLevel: string;
    defaultStorageMode: string | null;
    encryptionRequired: boolean;
    hashingRequired: boolean;
    rawStorageAllowed: boolean;
  }>;
  sensitiveFieldRules: Array<{
    sensitiveFieldRuleId: string;
    tableName: string;
    fieldName: string;
    classificationCode: string;
    storageMode: string;
    searchStrategy: string | null;
    maskingStrategy: string | null;
    accessPolicyCode: string | null;
  }>;
  dataQualityRules: Array<{
    dataQualityRuleId: string;
    ruleCode: string;
    ruleName: string;
    targetTable: string;
    targetField: string | null;
    severity: string;
    expectedAction: string;
    isActive: boolean;
  }>;
};

export type RiskPolicyCurrent = {
  modelVersions: Array<{
    riskModelVersionId: string;
    modelCode: string;
    versionCode: string;
    modelType: string;
    assessmentType: string;
    status: string;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
  }>;
  rulesetVersions: Array<{
    riskRulesetVersionId: string;
    rulesetCode: string;
    versionCode: string;
    assessmentType: string;
    status: string;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    rules: Array<{
      riskPolicyRuleId: string;
      ruleCode: string;
      ruleName: string;
      riskDimension: string;
      ruleType: string;
      severity: string;
      actionCode: string;
      reasonCode: string;
      isHardStop: boolean;
    }>;
  }>;
  riskSignalSeeds: Array<{
    riskSignalSeedId: string;
    signalCode: string;
    signalName: string;
    signalType: string;
    sourceEntity: string;
    riskDimension: string | null;
    priority: string | null;
    expectedDirection: string | null;
    isActive: boolean;
  }>;
};

export type DataQualityIssue = {
  issueId: string;
  severity: string | null;
  entityType: string | null;
  entityId: string | null;
  issueCode: string;
  status: string;
  detectedAt: string | null;
  resolvedAt: string | null;
};
export type DataQualityIssueListResponse = PaginatedResponse<DataQualityIssue>;
export type ResolveDataQualityIssueInput = {
  resolution: "resolved" | "ignored";
  reasonCode: string;
  notes: string;
};
