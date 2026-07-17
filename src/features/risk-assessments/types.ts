/**
 * Los tipos siguen los modelos Sequelize crudos de AtlasBackend
 * (`src/database/models/`), que el controlador devuelve sin serializador
 * intermedio. Casi todo el atributo es nullable en la base, y las columnas
 * DECIMAL viajan como string (el driver de Postgres no las convierte a number
 * para no perder precisión) — de ahí `string | null` en los scores.
 */

export type RiskAssessmentRun = {
  id: string;
  tenantId: string;
  subjectType: string | null;
  subjectId: string | null;
  customerId: string | null;
  sessionId: string | null;
  onboardingFlowId: string | null;
  deviceId: string | null;
  featureSnapshotId: string | null;
  riskModelVersionId: string | null;
  riskRulesetVersionId: string | null;
  assessmentType: string | null;
  triggerSource: string | null;
  idempotencyKey: string | null;
  runStatus: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  createdAtValue: string;
};

export type RiskResult = {
  id: string;
  tenantId: string;
  riskAssessmentRunId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  customerId: string | null;
  sessionId: string | null;
  onboardingFlowId: string | null;
  deviceId: string | null;
  assessmentType: string | null;
  recommendedAction: string | null;
  riskLevel: string | null;
  scoreTotal: string | null;
  fraudScore: string | null;
  identityScore: string | null;
  deviceRiskScore: string | null;
  behaviorScore: string | null;
  contactabilityScore: string | null;
  consistencyScore: string | null;
  reasonCodesJson: Record<string, unknown> | null;
  modelVersionCodeSnapshot: string | null;
  rulesetVersionCodeSnapshot: string | null;
  featureSnapshotId: string | null;
  integrityHash: string | null;
  decidedAt: string | null;
  createdAtValue: string;
};

export type RiskRuleFired = {
  id: string;
  tenantId: string;
  riskAssessmentRunId: string | null;
  riskPolicyRuleId: string | null;
  ruleCodeSnapshot: string | null;
  rulesetVersionCodeSnapshot: string | null;
  riskDimension: string | null;
  inputValuesJson: Record<string, unknown> | null;
  outputAction: string | null;
  reasonCode: string | null;
  severity: string | null;
  isHardStop: boolean | null;
  firedAt: string | null;
  createdAtValue: string;
};

export type RiskFeatureContribution = {
  id: string;
  tenantId: string;
  riskAssessmentRunId: string | null;
  featureCode: string | null;
  rawValueJson: Record<string, unknown> | null;
  binOrAttribute: string | null;
  woeValue: string | null;
  scorePoints: string | null;
  reasonCode: string | null;
  createdAtValue: string;
};

export type RiskFeatureSnapshot = {
  id: string;
  tenantId: string;
  subjectType: string | null;
  subjectId: string | null;
  customerId: string | null;
  deviceId: string | null;
  snapshotReason: string | null;
  triggeringEntityType: string | null;
  triggeringEntityId: string | null;
  riskAssessmentRunId: string | null;
  sessionId: string | null;
  onboardingFlowId: string | null;
  featureSetVersion: string | null;
  catalogVersionsJson: Record<string, unknown> | null;
  featuresJson: Record<string, unknown> | null;
  missingFeaturesJson: Record<string, unknown> | null;
  integrityHash: string | null;
  createdAtValue: string;
};

export type RiskAssessmentDetail = {
  run: RiskAssessmentRun;
  result: RiskResult | null;
  rulesFired: RiskRuleFired[];
  featureContributions: RiskFeatureContribution[];
  featureSnapshot: RiskFeatureSnapshot | null;
};

/**
 * `code` y `label` se arman con `featureCode` y `reasonCode` de las
 * contribuciones, ambos nullable en la base — el backend no los filtra.
 */
export type RiskExplanationFactor = {
  code: string | null;
  label: string | null;
  impact: "positive" | "negative";
};

/**
 * `decision` y `recommendedAction` son el MISMO campo del modelo
 * (`result.recommendedAction`); el backend lo expone bajo dos nombres.
 */
export type RiskAssessmentExplanation = {
  decision: string | null;
  summary: string;
  topPositiveFactors: RiskExplanationFactor[];
  topNegativeFactors: RiskExplanationFactor[];
  rulesFired: string[];
  recommendedAction: string | null;
};
