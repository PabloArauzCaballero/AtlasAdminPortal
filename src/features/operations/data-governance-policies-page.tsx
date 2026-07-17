"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useDataGovernancePolicies } from "@/features/operations/hooks";
import type { DataGovernancePolicies } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
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
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["governance.policies.read"]}>
      <AuthorizedDataGovernancePoliciesPage />
    </PermissionGate>
  );
}

function AuthorizedDataGovernancePoliciesPage() {
  const governance = useDataGovernancePolicies();
  const rows = useMemo(
    () => (governance.data ? rowsFrom(governance.data) : []),
    [governance.data],
  );
  return (
    <>
      <PageHeader
        eyebrow="Políticas de gobierno"
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
              {rows.length === 0 ? (
                <EmptyState title="No hay políticas de gobierno sembradas." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((row) => (
                    <PolicyCard key={row.id} row={row} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function PolicyCard({ row }: Readonly<{ row: PolicyRow }>) {
  return (
    <article className="flex flex-col rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-shadow hover:shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Badge tone="info">{row.type}</Badge>
        <StatusBadge value={row.active ? "active" : "inactive"} />
      </div>
      <Link
        className="font-mono text-xs font-semibold text-blue-700 hover:underline"
        href={`/internal/governance/policies/${encodeURIComponent(row.id)}`}
      >
        {row.code}
      </Link>
      <h3 className="mt-1 text-sm font-medium text-atlas-text">{row.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-atlas-soft p-2">
          <dt className="text-atlas-muted">Alcance</dt>
          <dd className="mt-0.5 font-medium text-atlas-text">{row.scope}</dd>
        </div>
        <div className="rounded-md bg-atlas-soft p-2">
          <dt className="text-atlas-muted">Control</dt>
          <dd className="mt-0.5 font-medium text-atlas-text">{row.control}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-atlas-muted">{row.detail}</p>
    </article>
  );
}
