"use client";

import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { formatBoolean, safeText } from "@/shared/lib/format";
import type { GovernancePolicyDetail } from "./types";

const labels: Record<string, string> = {
  mutationMode: "Modo de mutación",
  appendOnly: "Append only",
  updateAllowed: "Permite update",
  deleteAllowed: "Permite delete",
  hardDeleteAllowed: "Permite hard delete",
  exportAllowed: "Permite exportar",
  approvalRequired: "Requiere aprobación",
  reasonRequired: "Requiere motivo",
  auditRequired: "Auditoría obligatoria",
  maskingStrategy: "Masking",
  retentionDays: "Retención días",
};

export function PolicyConfigSummary({
  policy,
}: Readonly<{ policy: GovernancePolicyDetail }>) {
  const items = Object.entries(labels).map(([key, label]) => ({
    label,
    value: formatConfigValue(policy.metadata?.[key]),
  }));

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Configuración operativa"
          description="Reglas que el backend debe obedecer al escribir, retener, auditar o exportar datos."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <KeyValueGrid items={items} />
      </CardContent>
    </Card>
  );
}

function formatConfigValue(value: unknown) {
  if (typeof value === "boolean") return formatBoolean(value);
  return safeText(value);
}
