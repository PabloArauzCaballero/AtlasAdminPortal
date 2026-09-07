"use client";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useCurrentRiskPolicy } from "@/features/operations/hooks";
import { AvisoDeAutoriaEnElMotor } from "./policy-authoring-notice";
import type { RiskPolicyCurrent } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { Scale } from "lucide-react";
type RuleRow = RiskPolicyCurrent["rulesetVersions"][number]["rules"][number] & {
  ruleset: string;
  rulesetStatus: string;
};

export function CurrentRiskPolicyPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedCurrentRiskPolicyPage />
    </PermissionGate>
  );
}

function AuthorizedCurrentRiskPolicyPage() {
  const policy = useCurrentRiskPolicy();
  const rules = useMemo<RuleRow[]>(
    () =>
      (policy.data?.rulesetVersions ?? []).flatMap((ruleset) =>
        ruleset.rules.map((rule) => ({
          ...rule,
          ruleset: `${ruleset.rulesetCode}@${ruleset.versionCode}`,
          rulesetStatus: ruleset.status,
        })),
      ),
    [policy.data?.rulesetVersions],
  );
  const columns = useMemo<ColumnDef<RuleRow>[]>(
    () => [
      {
        header: "Ruleset",
        accessorKey: "ruleset",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ruleset}</span>
        ),
      },
      {
        header: "Regla",
        accessorKey: "ruleName",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.ruleName}</span>
        ),
      },
      {
        header: "Código",
        accessorKey: "ruleCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ruleCode}</span>
        ),
      },
      { header: "Dimensión", accessorKey: "riskDimension" },
      { header: "Tipo", accessorKey: "ruleType" },
      { header: "Severidad", accessorKey: "severity" },
      { header: "Acción", accessorKey: "actionCode" },
      {
        header: "Hard stop",
        accessorKey: "isHardStop",
        cell: ({ row }) => (row.original.isHardStop ? "Sí" : "No"),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        icon={Scale}
        eyebrow="Política de riesgo"
        title="Política de riesgo actual"
        description="Qué política LOCAL está vigente. Es la red de seguridad para cuando el Motor no responde, no la política que decide en condiciones normales."
      />

      <AvisoDeAutoriaEnElMotor />
      {policy.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {policy.error ? (
        <ErrorState
          description={
            isAtlasApiError(policy.error)
              ? policy.error.message
              : "No se pudo cargar política de riesgo."
          }
          requestId={
            isAtlasApiError(policy.error) ? policy.error.requestId : undefined
          }
          onRetry={() => void policy.refetch()}
        />
      ) : null}
      {policy.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Modelos"
              value={formatNumber(policy.data.modelVersions.length)}
            />
            <MetricCard
              label="Rulesets"
              value={formatNumber(policy.data.rulesetVersions.length)}
            />
            <MetricCard label="Reglas" value={formatNumber(rules.length)} />
            <MetricCard
              label="Señales"
              value={formatNumber(policy.data.riskSignalSeeds.length)}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Versiones"
                description="Estado efectivo de modelos y rulesets."
                className="mb-0"
              />
            </CardHeader>
            <CardContent className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              {policy.data.rulesetVersions.map((r) => (
                <div
                  key={r.riskRulesetVersionId}
                  className="rounded-lg border border-atlas-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="font-mono text-sm">
                      {r.rulesetCode}@{r.versionCode}
                    </strong>
                    <StatusBadge value={r.status} />
                  </div>
                  <p className="mt-2 text-xs text-atlas-muted">
                    Tipo: {safeText(r.assessmentType)} · Desde:{" "}
                    {formatDateTime(r.effectiveFrom)} · Hasta:{" "}
                    {formatDateTime(r.effectiveUntil)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Reglas de política"
                description="Reglas asociadas a los rulesets actuales."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={rules}
                columns={columns}
                emptyTitle="No hay reglas de riesgo visibles."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
