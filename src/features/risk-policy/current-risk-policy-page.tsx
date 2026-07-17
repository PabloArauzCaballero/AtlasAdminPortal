"use client";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentRiskPolicy } from "@/features/operations/hooks";
import { canActivateRuleset } from "@/features/operations/catalog-version-lifecycle";
import { RulesetActivateDialog } from "@/features/operations/ruleset-activate-dialog";
import type { RiskPolicyCurrent } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { RoleGate } from "@/shared/auth/role-gate";
import { Button } from "@/shared/components/ui/button";
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
type RuleRow = RiskPolicyCurrent["rulesetVersions"][number]["rules"][number] & {
  ruleset: string;
  rulesetStatus: string;
};
type ActivationTarget = { id: string; label: string };

export function CurrentRiskPolicyPage() {
  const [activating, setActivating] = useState<ActivationTarget | null>(null);
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
    <PermissionGate permissions={["lineage.read"]}>
      <PageHeader
        eyebrow="Política de riesgo"
        title="Política de riesgo actual"
        description="Consulta de `/operations/risk-policy/current`. Las versiones nuevas se crean en borrador y solo un administrador puede activarlas."
        actions={
          <Link href="/internal/risk-policy/ruleset-versions/new">
            <Button>Nueva versión de ruleset</Button>
          </Link>
        }
      />
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <CardContent className="grid gap-3 lg:grid-cols-2">
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
                  {/* Activar está restringido a admin/platform_admin en el
                      backend (403 al resto), así que no se le muestra el botón
                      a quien no puede usarlo. El gate es cosmético: manda el rol
                      del token. */}
                  {canActivateRuleset(r.status) ? (
                    <RoleGate roles={["SUPER_ADMIN"]} fallback={null}>
                      <Button
                        className="mt-3 h-8 text-xs"
                        variant="primary"
                        onClick={() =>
                          setActivating({
                            id: r.riskRulesetVersionId,
                            label: `${r.rulesetCode}@${r.versionCode}`,
                          })
                        }
                      >
                        Activar versión
                      </Button>
                    </RoleGate>
                  ) : null}
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
      {activating ? (
        <RulesetActivateDialog
          rulesetVersionId={activating.id}
          rulesetLabel={activating.label}
          onClose={() => setActivating(null)}
        />
      ) : null}
    </PermissionGate>
  );
}
