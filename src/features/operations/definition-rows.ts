import type { DefinitionListResponse } from "@/features/operations/types";

/**
 * Las filas de la tabla de definiciones, aplanadas desde las cuatro familias que devuelve el
 * servicio (eventos, atributos, señales y features).
 *
 * Vive fuera de la pantalla porque es una transformación de datos pura y se puede probar sin montar
 * la vista — y porque el archivo de la pantalla ya estaba en el techo de tamaño del repositorio.
 */
export type DefinitionRow = {
  id: string;
  type: string;
  code: string;
  name: string;
  family: string | null;
  dataType: string | null;
  riskDimension: string | null;
  flags: string;
  isActive: boolean;
  ownerTeam: string | null;
  domainCode: string | null;
  reviewStatus: string;
  relatedTables: string[];
};
export function toRows(data: DefinitionListResponse): DefinitionRow[] {
  return [
    ...data.events.map((i) => ({
      id: i.eventDefinitionId,
      type: "Evento",
      code: i.eventCode,
      name: i.eventName,
      family: i.eventFamily ?? i.sourcePackage,
      dataType: null,
      riskDimension: i.riskDimension,
      flags: i.isHighVolume ? "Alto volumen" : "—",
      isActive: i.isActive,
      ownerTeam: i.ownerTeam,
      domainCode: i.domainCode,
      reviewStatus: i.reviewStatus,
      relatedTables: i.relatedTables,
    })),
    ...data.observations.map((i) => ({
      id: i.observationDefinitionId,
      type: "Observación",
      code: i.observationCode,
      name: i.observationName,
      family: i.sourceGroup,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags: "—",
      isActive: i.isActive,
      ownerTeam: i.ownerTeam,
      domainCode: i.domainCode,
      reviewStatus: i.reviewStatus,
      relatedTables: [],
    })),
    ...data.attributes.map((i) => ({
      id: i.attributeDefinitionId,
      type: "Atributo",
      code: i.attributeCode,
      name: i.attributeName,
      family: i.entityScope,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags: i.isSensitive ? "Sensible" : "—",
      isActive: i.isActive,
      ownerTeam: i.ownerTeam,
      domainCode: i.domainCode,
      reviewStatus: i.reviewStatus,
      relatedTables: [],
    })),
    ...data.features.map((i) => ({
      id: i.featureDefinitionId,
      type: "Feature",
      code: i.featureCode,
      name: i.featureName,
      family: i.featureFamily,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags:
        [i.isModelInput ? "Modelo" : null, i.isPolicyRuleInput ? "Regla" : null]
          .filter(Boolean)
          .join(", ") || "—",
      isActive: i.isActive,
      ownerTeam: i.ownerTeam,
      domainCode: i.domainCode,
      reviewStatus: i.reviewStatus,
      relatedTables: [],
    })),
  ];
}
