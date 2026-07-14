"use client";

import { useMemo, useState } from "react";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { DataTable } from "@/shared/components/data-table/data-table";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useSchemaTables, useSchemaVersion } from "./hooks";
import { buildSchemaTableColumns } from "./schema-table-columns";

export function SchemaVersionDetailPage({
  versionId,
}: Readonly<{ versionId: string }>) {
  const [page, setPage] = useState(1);
  const version = useSchemaVersion(versionId);
  const tables = useSchemaTables({
    versionId,
    limit: 50,
    offset: (page - 1) * 50,
  });
  const columns = useMemo(() => buildSchemaTableColumns(), []);

  return (
    <>
      <PageHeader
        eyebrow="Esquema"
        title={
          version.data ? version.data.versionCode : `Versión #${versionId}`
        }
        description="Tablas registradas en esta versión del catálogo de esquema, con sus columnas y relaciones."
      />
      {version.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {version.error ? (
        <ErrorState
          description={
            isAtlasApiError(version.error)
              ? version.error.message
              : `No se pudo cargar la versión #${versionId}.`
          }
          requestId={
            isAtlasApiError(version.error) ? version.error.requestId : undefined
          }
          onRetry={() => void version.refetch()}
        />
      ) : null}
      {version.data ? (
        <div className="mb-6">
          <KeyValueSection
            title="Versión"
            items={[
              { label: "Código", value: version.data.versionCode, mono: true },
              {
                label: "Estado",
                value: version.data.isActive ? "Activa" : "Inactiva",
              },
              { label: "Notas", value: version.data.notes },
              {
                label: "Versión padre",
                value: version.data.parentVersionId,
                mono: true,
              },
              {
                label: "Creada",
                value: formatDateTime(version.data.createdAt),
              },
            ]}
          />
        </div>
      ) : null}
      {tables.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {tables.error ? (
        <ErrorState
          description={
            isAtlasApiError(tables.error)
              ? tables.error.message
              : "No se pudieron cargar las tablas de esta versión."
          }
          requestId={
            isAtlasApiError(tables.error) ? tables.error.requestId : undefined
          }
          onRetry={() => void tables.refetch()}
        />
      ) : null}
      {tables.data ? (
        <DataTable
          data={tables.data.items}
          columns={columns}
          meta={tables.data.meta}
          onPageChange={setPage}
          emptyTitle="Esta versión no tiene tablas registradas."
        />
      ) : null}
    </>
  );
}
