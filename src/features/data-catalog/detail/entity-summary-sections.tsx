"use client";

import type { DataEntity } from "@/features/systems/types";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { formatBoolean } from "@/shared/lib/format";

export function EntitySummarySections({
  entity,
}: Readonly<{ entity: DataEntity }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <KeyValueSection
        title="Identificación técnica"
        description="Cómo existe la tabla en la base de datos y en el código."
        items={[
          { label: "Schema", value: entity.schemaName, mono: true },
          { label: "Tabla", value: entity.tableName, mono: true },
          { label: "Modelo", value: entity.modelName, mono: true },
          { label: "Detección", value: entity.detectedFrom },
        ]}
      />
      <KeyValueSection
        title="Contexto de negocio"
        description="Información necesaria para que sistemas y negocio hablen el mismo idioma."
        items={[
          { label: "Nombre de negocio", value: entity.entityName },
          { label: "Módulo", value: entity.module },
          { label: "Owner", value: entity.dataOwner },
          { label: "Propósito", value: entity.businessPurpose },
        ]}
      />
      <KeyValueSection
        title="Clasificación"
        description="Señales usadas por gobierno, auditoría, QA y ML."
        items={[
          { label: "PII", value: formatBoolean(entity.containsPii) },
          {
            label: "Financiera",
            value: formatBoolean(entity.containsFinancialData),
          },
          { label: "Riesgo", value: formatBoolean(entity.containsRiskData) },
          { label: "Legal", value: formatBoolean(entity.containsLegalData) },
        ]}
      />
      <KeyValueSection
        title="Gobierno operativo"
        description="Reglas que el backend debe respetar en escrituras, borrados y auditoría."
        items={[
          { label: "Append only", value: formatBoolean(entity.isAppendOnly) },
          {
            label: "Update permitido",
            value: formatBoolean(entity.allowsUpdates),
          },
          {
            label: "Delete permitido",
            value: formatBoolean(entity.allowsDeletes),
          },
          {
            label: "Auditoría crítica",
            value: formatBoolean(entity.isAuditCritical),
          },
        ]}
      />
    </div>
  );
}
