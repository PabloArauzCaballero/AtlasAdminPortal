"use client";

import type { DataEntity } from "@/features/systems/types";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { formatBoolean } from "@/shared/lib/format";

export function EntityGovernanceSummary({
  entity,
}: Readonly<{ entity: DataEntity }>) {
  return (
    <div className="space-y-4">
      <KeyValueSection
        title="Clasificación de datos"
        description="Define sensibilidad y restricciones de uso por dominio."
        items={[
          {
            label: "Contiene datos personales",
            value: formatBoolean(entity.containsPii),
          },
          {
            label: "Datos financieros",
            value: formatBoolean(entity.containsFinancialData),
          },
          {
            label: "Datos de riesgo",
            value: formatBoolean(entity.containsRiskData),
          },
          {
            label: "Datos legales",
            value: formatBoolean(entity.containsLegalData),
          },
          { label: "Device", value: formatBoolean(entity.containsDeviceData) },
          {
            label: "Location",
            value: formatBoolean(entity.containsLocationData),
          },
        ]}
      />
      {/*
       * El bloque «Reglas operativas» (append only, update, delete, hard delete, aprobación) se
       * retiró: el catálogo no guarda esas reglas y la pantalla las enseñaba como «No» para toda
       * tabla. Una regla mostrada sin saberla es peor que no mostrarla.
       */}
      <KeyValueSection
        title="Auditoría"
        description="Si los cambios de esta tabla deben quedar trazados para auditoría."
        items={[
          {
            label: "Auditoría crítica",
            value: formatBoolean(entity.isAuditCritical),
          },
        ]}
      />
      <KeyValueSection
        title="Responsabilidad y vigencia"
        description="Responsables, retención y estado de revisión."
        items={[
          { label: "Responsable", value: entity.dataOwner },
          { label: "Retención", value: entity.retentionPolicyCode, mono: true },
          { label: "Estado review", value: entity.reviewStatus },
          { label: "Fuente detección", value: entity.detectedFrom },
          { label: "Confianza", value: entity.confidenceLevel },
        ]}
      />
    </div>
  );
}
