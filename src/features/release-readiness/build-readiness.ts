import type {
  DataEntity,
  EndpointItem,
  ReviewQueue,
  StressMatrixItem,
  TestSuite,
  ToolHealth,
} from "@/features/systems/types";
import type {
  ContextCatalog,
  DataGovernancePolicies,
  DataQualityIssue,
  DefinitionListResponse,
  RiskPolicyCurrent,
} from "@/features/operations/types";
import { formatNumber } from "@/shared/lib/format";
import { statusFromScore } from "./readiness-score";
import type { ReadyItem } from "./readiness-types";

export type BuildReadinessInput = {
  endpoints: EndpointItem[];
  entities: DataEntity[];
  suites: TestSuite[];
  reviewQueue?: ReviewQueue;
  toolsHealth: ToolHealth[];
  stressMatrix: StressMatrixItem[];
  catalogs: ContextCatalog[];
  definitions?: DefinitionListResponse;
  governance?: DataGovernancePolicies;
  riskPolicy?: RiskPolicyCurrent;
  dataQuality: DataQualityIssue[];
};

export function buildReadiness(input: BuildReadinessInput): ReadyItem[] {
  const counts = calculateCounts(input);
  return [
    item(
      "review",
      "Cola de revisión",
      counts.totalReview,
      5,
      20,
      true,
      "elementos pendientes",
    ),
    item(
      "tools",
      "Herramientas críticas",
      counts.toolFailures,
      1,
      2,
      true,
      "herramientas críticas no OK",
    ),
    item(
      "stress",
      "Cobertura stress",
      counts.stressMissing,
      1,
      5,
      true,
      "endpoints sin perfil stress habilitado",
    ),
    item(
      "endpoint-purpose",
      "Propósito endpoints",
      counts.endpointsWithoutPurpose,
      5,
      15,
      true,
      "endpoints sin propósito",
    ),
    item(
      "table-purpose",
      "Propósito tablas",
      counts.tablesWithoutPurpose,
      5,
      15,
      true,
      "tablas sin propósito",
    ),
    item(
      "qa",
      "Suites QA",
      counts.enabledSuites,
      3,
      0,
      false,
      "suites habilitadas",
    ),
    item(
      "catalogs",
      "Catálogos operativos",
      counts.publishedCatalogs,
      3,
      0,
      false,
      "catálogos publicados",
    ),
    item(
      "definitions",
      "Definiciones negocio",
      counts.definitionsTotal,
      10,
      0,
      false,
      "definiciones registradas",
    ),
    item(
      "governance",
      "Gobierno real",
      counts.governanceTotal,
      10,
      0,
      false,
      "políticas/reglas reales",
    ),
    item(
      "risk-policy",
      "Política riesgo",
      counts.activeRiskRules,
      1,
      0,
      false,
      "reglas visibles",
    ),
    item(
      "quality",
      "Calidad de datos",
      counts.openQualityIssues,
      3,
      10,
      true,
      "issues abiertos",
    ),
  ];
}

function item(
  key: string,
  label: string,
  value: number,
  warning: number,
  blocked: number,
  inverse: boolean,
  suffix: string,
): ReadyItem {
  return {
    key,
    label,
    status: statusFromScore(value, warning, blocked, inverse),
    detail: `${formatNumber(value)} ${suffix}.`,
  };
}

function calculateCounts(input: BuildReadinessInput) {
  return {
    totalReview: reviewTotal(input.reviewQueue),
    toolFailures: input.toolsHealth.filter(isCriticalFailure).length,
    stressMissing: input.stressMatrix.filter(isStressMissing).length,
    endpointsWithoutPurpose: input.endpoints.filter(
      (item) => !item.businessPurpose,
    ).length,
    tablesWithoutPurpose: input.entities.filter((item) => !item.businessPurpose)
      .length,
    enabledSuites: input.suites.filter((item) => item.isEnabled).length,
    publishedCatalogs: input.catalogs.filter(
      (item) => item.currentVersion?.status === "published",
    ).length,
    definitionsTotal: definitionsCount(input.definitions),
    governanceTotal: governanceCount(input.governance),
    activeRiskRules:
      input.riskPolicy?.rulesetVersions.flatMap((r) => r.rules).length ?? 0,
    openQualityIssues: input.dataQuality.filter((item) => !item.resolvedAt)
      .length,
  };
}

function reviewTotal(queue?: ReviewQueue) {
  if (!queue) return 0;
  return (
    queue.endpoints.total +
    queue.dataEntities.total +
    queue.dataEntityImpacts.total +
    queue.fieldImpacts.total +
    queue.toolRequirements.total
  );
}

function isCriticalFailure(item: ToolHealth) {
  return item.status && item.status.toUpperCase() !== "OK" && item.isCritical;
}

function isStressMissing(item: StressMatrixItem) {
  return item.endpoint.requiresStressTest && !item.hasEnabledProfile;
}

function definitionsCount(data?: DefinitionListResponse) {
  if (!data) return 0;
  return (
    data.events.length +
    data.observations.length +
    data.attributes.length +
    data.features.length
  );
}

function governanceCount(data?: DataGovernancePolicies) {
  if (!data) return 0;
  return (
    data.classificationPolicies.length +
    data.retentionPolicies.length +
    data.sensitiveFieldRules.length +
    data.dataQualityRules.length
  );
}
