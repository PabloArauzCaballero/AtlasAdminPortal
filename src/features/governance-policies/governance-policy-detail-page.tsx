"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useGovernancePolicy } from "./hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import {
  buildActionColumns,
  buildApprovalColumns,
  buildControlColumns,
} from "./policy-tables";
import { PolicyConfigSummary } from "./policy-config-summary";
import { PolicyScopeTable } from "./policy-scope-table";

export function GovernancePolicyDetailPage(
  props: Readonly<{ policyId: string }>,
) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["governance.policies.read"]}>
      <AuthorizedGovernancePolicyDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedGovernancePolicyDetailPage({
  policyId,
}: Readonly<{ policyId: string }>) {
  const policy = useGovernancePolicy(policyId);
  const data = policy.data;

  return (
    <>
      <PageHeader
        eyebrow="Gobierno"
        title={data?.name ?? "Detalle de política"}
        description="Política de gobierno con alcance, controles y acciones configurables."
        actions={
          data ? (
            <>
              <Link
                href={`/internal/governance/policies/${policyId}/configure`}
              >
                <Button>Configurar política</Button>
              </Link>
              <StatusBadge value={data.status} />
            </>
          ) : null
        }
      />
      {policy.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {policy.error ? (
        <PolicyError error={policy.error} retry={policy.refetch} />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <KeyValueGrid
            items={[
              { label: "Clave", value: data.key, mono: true },
              { label: "Tipo", value: data.policyType },
              { label: "Versión", value: data.version },
              { label: "Dueño", value: data.owner },
              {
                label: "Vigente desde",
                value: formatDateTime(data.effectiveFrom),
              },
              {
                label: "Vigente hasta",
                value: formatDateTime(data.effectiveUntil),
              },
            ]}
          />
          <PolicyConfigSummary policy={data} />
          <PolicyScopeTable policy={data} />
          <PolicyTable
            title="Acciones configurables"
            data={data.actions ?? []}
            columns={buildActionColumns()}
            emptyTitle="No hay acciones registradas."
          />
          <PolicyTable
            title="Controles"
            data={data.controls ?? []}
            columns={buildControlColumns()}
            emptyTitle="No hay controles registrados."
          />
          <PolicyTable
            title="Aprobaciones"
            data={data.approvals ?? []}
            columns={buildApprovalColumns()}
            emptyTitle="No hay aprobaciones registradas."
          />
        </div>
      ) : null}
    </>
  );
}

function PolicyTable<T>({
  title,
  data,
  columns,
  emptyTitle,
}: Readonly<{
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title={title} className="mb-0" />
      </CardHeader>
      <CardContent>
        <DataTable data={data} columns={columns} emptyTitle={emptyTitle} />
      </CardContent>
    </Card>
  );
}

function PolicyError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: () => unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo cargar la política."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={() => void retry()}
    />
  );
}
