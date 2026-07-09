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
          { label: "Contiene PII", value: formatBoolean(entity.containsPii) },
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
      <KeyValueSection
        title="Reglas operativas"
        description="Acciones que luego el backend debe permitir o bloquear."
        items={[
          { label: "Append only", value: formatBoolean(entity.isAppendOnly) },
          {
            label: "Permite update",
            value: formatBoolean(entity.allowsUpdates),
          },
          {
            label: "Permite delete",
            value: formatBoolean(entity.allowsDeletes),
          },
          {
            label: "Permite hard delete",
            value: formatBoolean(entity.allowsHardDeletes),
          },
          {
            label: "Requiere aprobación",
            value: formatBoolean(entity.requiresApproval),
          },
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
          { label: "Owner", value: entity.dataOwner },
          { label: "Retención", value: entity.retentionPolicyCode, mono: true },
          { label: "Estado review", value: entity.reviewStatus },
          { label: "Fuente detección", value: entity.detectedFrom },
          { label: "Confianza", value: entity.confidenceLevel },
        ]}
      />
    </div>
  );
}
