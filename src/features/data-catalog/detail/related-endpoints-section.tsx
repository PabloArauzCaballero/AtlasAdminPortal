"use client";

import { useMemo } from "react";
import type { DataEntityImpact } from "@/features/systems/types";
import { useEndpointsByIds } from "@/features/systems/hooks";
import { DataTable } from "@/shared/components/data-table/data-table";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { buildRelatedEndpointColumns } from "../entity-detail-columns";

export function RelatedEndpointsSection({
  isLoading,
  error,
  retry,
  data,
}: Readonly<{
  isLoading: boolean;
  error: unknown;
  retry: () => unknown;
  data: DataEntityImpact[];
}>) {
  const endpointIds = useMemo(
    () => data.map((impact) => impact.endpointId),
    [data],
  );
  const endpoints = useEndpointsByIds(endpointIds);
  const columns = useMemo(
    () => buildRelatedEndpointColumns(endpoints.byId),
    [endpoints.byId],
  );

  return (
    <div className="space-y-4">
      {isLoading || endpoints.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {error ? <EntityError error={error} retry={retry} /> : null}
      {!error ? (
        <DataTable
          data={data}
          columns={columns}
          emptyTitle="Relación con endpoints pendiente."
          emptyDescription="La tabla aún no tiene impactos registrados. Revisa endpoint_impacts o el seed de catalogación."
        />
      ) : null}
    </div>
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
          : "No se pudo cargar la información solicitada."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={() => void retry()}
    />
  );
}
