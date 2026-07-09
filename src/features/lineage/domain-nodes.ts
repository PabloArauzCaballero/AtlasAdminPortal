import type { DataEntity, EndpointItem } from "@/features/systems/types";

export type DomainNode = {
  name: string;
  endpoints: number;
  dataEntities: number;
  riskyEndpoints: number;
  sensitiveTables: number;
};

function isRiskyEndpoint(endpoint: EndpointItem) {
  return (
    endpoint.riskLevel === "HIGH" ||
    endpoint.riskLevel === "CRITICAL" ||
    endpoint.containsPii ||
    endpoint.isDestructive
  );
}

function isSensitiveEntity(entity: DataEntity) {
  return (
    entity.containsPii ||
    entity.containsFinancialData ||
    entity.containsRiskData ||
    entity.containsLegalData ||
    entity.isAuditCritical
  );
}

export function buildDomainNodes(
  endpoints: EndpointItem[],
  entities: DataEntity[],
): DomainNode[] {
  const map = new Map<string, DomainNode>();

  const ensure = (name?: string | null) => {
    const key = name?.trim() || "Sin dominio";
    const current = map.get(key) ?? {
      name: key,
      endpoints: 0,
      dataEntities: 0,
      riskyEndpoints: 0,
      sensitiveTables: 0,
    };
    map.set(key, current);
    return current;
  };

  endpoints.forEach((endpoint) => {
    const node = ensure(endpoint.module);
    node.endpoints += 1;
    if (isRiskyEndpoint(endpoint)) node.riskyEndpoints += 1;
  });

  entities.forEach((entity) => {
    const node = ensure(entity.module);
    node.dataEntities += 1;
    if (isSensitiveEntity(entity)) node.sensitiveTables += 1;
  });

  return Array.from(map.values()).sort(
    (a, b) => b.endpoints + b.dataEntities - (a.endpoints + a.dataEntities),
  );
}

export function countSensitiveNodes(nodes: DomainNode[]) {
  return nodes.reduce(
    (sum, node) => sum + node.sensitiveTables + node.riskyEndpoints,
    0,
  );
}
