"use client";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useDataGovernancePolicies } from "@/features/operations/hooks";
import type { DataGovernancePolicies } from "@/features/operations/types";
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
import { formatBoolean, formatNumber, safeText } from "@/shared/lib/format";
type PolicyRow = {
  id: string;
  type: string;
  code: string;
  name: string;
  scope: string;
  control: string;
  detail: string;
  active: boolean;
};
function rowsFrom(data: DataGovernancePolicies): PolicyRow[] {
  return [
    ...data.privacyPurposes.map((i) => ({
      id: `purpose:${i.purposeId}`,
      type: "Propósito privacidad",
      code: i.purposeCode,
      name: i.purposeName,
      scope: safeText(i.legalBasis),
      control: i.requiresExplicitConsent
        ? "Consentimiento explícito"
        : "Base no explícita",
      detail: safeText(i.legalBasis),
      active: true,
    })),
    ...data.retentionPolicies.map((i) => ({
      id: `retention:${i.retentionPolicyId}`,
      type: "Retención",
      code: i.policyCode,
      name: i.appliesTo,
      scope: i.appliesTo,
      control: `${formatNumber(i.retentionDays)} días`,
      detail: `${i.postRetentionAction} · ${safeText(i.legalBasis)}`,
      active: true,
    })),
    ...data.classificationPolicies.map((i) => ({
      id: `classification:${i.classificationPolicyId}`,
      type: "Clasificación",
      code: i.classificationCode,
      name: i.classificationName,
      scope: i.sensitivityLevel,
      control: i.defaultStorageMode ?? "—",
      detail: `Cifrado: ${formatBoolean(i.encryptionRequired)} · Hash: ${formatBoolean(i.hashingRequired)} · Raw: ${formatBoolean(i.rawStorageAllowed)}`,
      active: true,
    })),
    ...data.sensitiveFieldRules.map((i) => ({
      id: `sensitive:${i.sensitiveFieldRuleId}`,
      type: "Campo sensible",
      code: `${i.tableName}.${i.fieldName}`,
      name: i.classificationCode,
      scope: i.tableName,
      control: i.storageMode,
      detail: `Masking: ${safeText(i.maskingStrategy)} · Acceso: ${safeText(i.accessPolicyCode)}`,
      active: true,
    })),
    ...data.dataQualityRules.map((i) => ({
      id: `quality:${i.dataQualityRuleId}`,
      type: "Calidad",
      code: i.ruleCode,
      name: i.ruleName,
      scope: `${i.targetTable}${i.targetField ? `.${i.targetField}` : ""}`,
      control: i.severity,
      detail: i.expectedAction,
      active: i.isActive,
    })),
  ];
}
export function DataGovernancePoliciesPage() {
  const governance = useDataGovernancePolicies();
  const rows = useMemo(
    () => (governance.data ? rowsFrom(governance.data) : []),
    [governance.data],
  );
  const columns = useMemo<ColumnDef<PolicyRow>[]>(
    () => [
      { header: "Tipo", accessorKey: "type" },
      {
        header: "Código",
        accessorKey: "code",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-blue-700 hover:underline"
            href={`/internal/governance/policies/${encodeURIComponent(row.original.id)}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        header: "Nombre",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      { header: "Alcance", accessorKey: "scope" },
      { header: "Control", accessorKey: "control" },
      { header: "Detalle", accessorKey: "detail" },
      {
        header: "Estado",
        accessorKey: "active",
        cell: ({ row }) => (
          <StatusBadge value={row.original.active ? "active" : "inactive"} />
        ),
      },
    ],
    [],
  );
  return (
    <PermissionGate permissions={["governance.policies.read"]}>
      <PageHeader
        eyebrow="Fase 4"
        title="Políticas reales de gobierno"
        description="Consume `/operations/data-governance/policies`; no deriva gobierno solo desde flags técnicos."
      />
      {governance.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {governance.error ? (
        <ErrorState
          description={
            isAtlasApiError(governance.error)
              ? governance.error.message
              : "No se pudieron cargar políticas de gobierno."
          }
          requestId={
            isAtlasApiError(governance.error)
              ? governance.error.requestId
              : undefined
          }
          onRetry={() => void governance.refetch()}
        />
      ) : null}
      {governance.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Políticas/control"
              value={formatNumber(rows.length)}
            />
            <MetricCard
              label="Campos sensibles"
              value={formatNumber(governance.data.sensitiveFieldRules.length)}
            />
            <MetricCard
              label="Consentimiento explícito"
              value={formatNumber(
                governance.data.privacyPurposes.filter(
                  (i) => i.requiresExplicitConsent,
                ).length,
              )}
            />
            <MetricCard
              label="Clases protegidas"
              value={formatNumber(
                governance.data.classificationPolicies.filter(
                  (i) => i.encryptionRequired || i.hashingRequired,
                ).length,
              )}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Inventario consolidado"
                description="Propósitos, retención, clasificación, reglas sensibles y calidad."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={rows}
                columns={columns}
                emptyTitle="No hay políticas de gobierno sembradas."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
