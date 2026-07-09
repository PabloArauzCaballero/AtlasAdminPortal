"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEndpoint, useEndpointImpact } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import {
  MethodBadge,
  ReviewStatusBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { EndpointTestCard } from "@/features/qa-lab/endpoint-test-card";
import { StressTestCard } from "@/features/qa-lab/stress-test-card";
import { EndpointContracts } from "./detail/endpoint-contracts";
import {
  buildDataImpactColumns,
  buildFieldColumns,
  buildToolColumns,
} from "./detail/endpoint-detail-columns";
import { EndpointSummary } from "./detail/endpoint-summary";

const tabs = [
  "Resumen",
  "Contratos",
  "Tablas impactadas",
  "Campos impactados",
  "Herramientas",
  "QA Lab",
];

export function EndpointDetailPage({
  endpointId,
}: Readonly<{ endpointId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const endpoint = useEndpoint(endpointId);
  const impact = useEndpointImpact(endpointId);
  const data = endpoint.data;
  const columns = useMemo(
    () => ({
      dataImpact: buildDataImpactColumns(),
      fields: buildFieldColumns(),
      tools: buildToolColumns(),
    }),
    [],
  );

  return (
    <PermissionGate permissions={["systems.endpoints.read"]}>
      {endpoint.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {endpoint.error ? (
        <EndpointError error={endpoint.error} retry={endpoint.refetch} />
      ) : null}
      {data ? (
        <>
          <PageHeader
            eyebrow={`Endpoint #${data.endpoint.endpointId}`}
            title={data.endpoint.routeName ?? data.endpoint.handlerName}
            description={
              data.endpoint.businessPurpose ??
              "Endpoint sin propósito de negocio documentado todavía."
            }
            actions={
              <>
                <Link
                  href={`/internal/qa/lab?endpointId=${data.endpoint.endpointId}`}
                >
                  <Button variant="primary">Probar endpoint</Button>
                </Link>
                <MethodBadge method={data.endpoint.method} />
                <RiskBadge value={data.endpoint.riskLevel} />
                <ReviewStatusBadge value={data.endpoint.reviewStatus} />
              </>
            }
          />
          <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          {activeTab === "Resumen" ? (
            <EndpointSummary endpoint={data.endpoint} />
          ) : null}
          {activeTab === "Contratos" ? (
            <EndpointContracts endpoint={data.endpoint} />
          ) : null}
          {activeTab === "Tablas impactadas" ? (
            <ImpactTable
              isLoading={impact.isLoading}
              error={impact.error}
              retry={impact.refetch}
              data={impact.data?.tables ?? data.dataEntityImpacts}
              columns={columns.dataImpact}
              emptyTitle="Tabla de impactos pendiente."
              emptyDescription="El backend aún no devolvió impactos de tablas para este endpoint. Revisa endpoint_table_impacts o el seed de catalogación."
            />
          ) : null}
          {activeTab === "Campos impactados" ? (
            <ImpactTable
              isLoading={impact.isLoading}
              error={impact.error}
              retry={impact.refetch}
              data={impact.data?.fields ?? data.fieldImpacts}
              columns={columns.fields}
              emptyTitle="Campos impactados pendientes."
              emptyDescription="El backend aún no devolvió campos impactados. Revisa field_impacts o el proceso de descubrimiento."
            />
          ) : null}
          {activeTab === "Herramientas" ? (
            <ImpactTable
              isLoading={impact.isLoading}
              error={impact.error}
              retry={impact.refetch}
              data={impact.data?.tools ?? data.toolRequirements}
              columns={columns.tools}
              emptyTitle="Herramientas requeridas pendientes."
              emptyDescription="El backend aún no devolvió herramientas asociadas. Revisa tool_requirements o systems_tools."
            />
          ) : null}
          {activeTab === "QA Lab" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <EndpointTestCard
                endpointId={data.endpoint.endpointId}
                endpoint={data.endpoint}
              />
              <StressTestCard
                endpointId={data.endpoint.endpointId}
                endpoint={data.endpoint}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </PermissionGate>
  );
}

function ImpactTable<T>({
  isLoading,
  error,
  retry,
  data,
  columns,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  isLoading: boolean;
  error: unknown;
  retry: () => unknown;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyDescription?: string;
}>) {
  return (
    <>
      {isLoading ? <LoadingSkeleton rows={5} /> : null}
      {error ? <EndpointError error={error} retry={retry} /> : null}
      {!error ? (
        <DataTable
          data={data}
          columns={columns}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      ) : null}
    </>
  );
}

function EndpointError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: () => unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo cargar la información del endpoint."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={() => void retry()}
    />
  );
}
