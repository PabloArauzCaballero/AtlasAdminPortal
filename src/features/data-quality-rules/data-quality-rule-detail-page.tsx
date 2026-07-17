"use client";

import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { RuleRunCard } from "./rule-run-card";
import { useDataQualityRule } from "./hooks";

export function DataQualityRuleDetailPage(props: Readonly<{ ruleId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["dataQuality.rules.read"]}>
      <AuthorizedDataQualityRuleDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedDataQualityRuleDetailPage({
  ruleId,
}: Readonly<{ ruleId: string }>) {
  const rule = useDataQualityRule(ruleId);

  return (
    <>
      <PageHeader
        eyebrow="Calidad de datos"
        title="Detalle de regla"
        description="Definición, target, configuración y ejecución controlada."
      />
      {rule.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {rule.error ? (
        <ErrorState
          description={
            isAtlasApiError(rule.error)
              ? rule.error.message
              : "No se pudo cargar la regla de calidad."
          }
          requestId={
            isAtlasApiError(rule.error) ? rule.error.requestId : undefined
          }
          onRetry={() => void rule.refetch()}
        />
      ) : null}
      {rule.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-atlas-text">
                    {rule.data.ruleName}
                  </h2>
                  <p className="mt-1 text-sm text-atlas-muted">
                    {safeText(rule.data.description)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={rule.data.status} />
                  <RiskBadge value={rule.data.severity} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <KeyValueGrid
                items={[
                  { label: "Código", value: rule.data.ruleCode, mono: true },
                  { label: "Tipo", value: rule.data.ruleType },
                  {
                    label: "Target",
                    value: `${rule.data.targetTable}.${rule.data.targetField ?? "*"}`,
                    mono: true,
                  },
                  { label: "Frecuencia", value: rule.data.frequency },
                  { label: "Dueño", value: rule.data.owner },
                  {
                    label: "Última ejecución",
                    value: formatDateTime(rule.data.lastRunAt),
                  },
                  {
                    label: "Estado última ejecución",
                    value: rule.data.lastRunStatus,
                  },
                  { label: "Issues abiertos", value: rule.data.openIssues },
                ]}
              />
              <JsonViewer title="Configuración" value={rule.data.checkConfig} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Acción esperada"
                description="Guía operativa devuelta por el catálogo de calidad."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-atlas-text">
                {safeText(rule.data.expectedAction)}
              </p>
            </CardContent>
          </Card>
          <RuleRunCard ruleId={ruleId} />
        </div>
      ) : null}
    </>
  );
}
