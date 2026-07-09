"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDataEntity, useTableImpact } from "@/features/systems/hooks";
import type { DataEntityColumn } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import {
  PiiBadge,
  ReviewStatusBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { ColumnCatalogSection } from "./detail/column-catalog-section";
import { EntitySummarySections } from "./detail/entity-summary-sections";
import { RelatedEndpointsSection } from "./detail/related-endpoints-section";
import { EntityGovernanceSummary } from "./entity-governance-summary";

const tabs = ["Vista general", "Columnas", "Endpoints", "Gobierno operativo"];

export function DataEntityDetailPage({
  entityId,
}: Readonly<{ entityId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const entity = useDataEntity(entityId);
  const tableImpact = useTableImpact(
    entity.data?.schemaName,
    entity.data?.tableName,
  );
  const columns = useMemo(
    () =>
      dedupeColumns([
        ...(entity.data?.columns ?? []),
        ...(tableImpact.data?.columns ?? []),
      ]),
    [entity.data?.columns, tableImpact.data?.columns],
  );

  return (
    <PermissionGate permissions={["catalog.data.read"]}>
      {entity.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {entity.error ? (
        <EntityError error={entity.error} retry={entity.refetch} />
      ) : null}
      {entity.data ? (
        <>
          <PageHeader
            eyebrow="Catálogo de datos"
            title={`${entity.data.schemaName}.${entity.data.tableName}`}
            description={
              entity.data.businessPurpose ??
              "Tabla pendiente de completar con propósito de negocio, owner y reglas operativas."
            }
            actions={
              <>
                <Link
                  href={`/internal/data-catalog/tables/${entityId}/metadata`}
                >
                  <Button variant="primary">Editar metadata</Button>
                </Link>
                <PiiBadge value={entity.data.containsPii} />
                <ReviewStatusBadge value={entity.data.reviewStatus} />
                <StatusBadge value={entity.data.status} />
              </>
            }
          />
          <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          {activeTab === "Vista general" ? (
            <EntitySummarySections entity={entity.data} />
          ) : null}
          {activeTab === "Columnas" ? (
            <ColumnCatalogSection columns={columns} />
          ) : null}
          {activeTab === "Endpoints" ? (
            <RelatedEndpointsSection
              isLoading={tableImpact.isLoading}
              error={tableImpact.error}
              retry={tableImpact.refetch}
              data={tableImpact.data?.endpointImpacts ?? []}
            />
          ) : null}
          {activeTab === "Gobierno operativo" ? (
            <EntityGovernanceSummary entity={entity.data} />
          ) : null}
        </>
      ) : null}
    </PermissionGate>
  );
}

function EntityError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: () => unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo cargar la tabla del catálogo."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={() => void retry()}
    />
  );
}

function dedupeColumns(columns: DataEntityColumn[]) {
  const seen = new Set<string>();
  return columns.filter((column) => {
    const key = column.columnId ?? column.columnName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
