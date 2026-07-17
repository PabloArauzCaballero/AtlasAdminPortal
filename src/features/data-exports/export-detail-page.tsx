"use client";

import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useDataExport } from "./hooks";
import { ExportDownloadAction } from "./export-download-action";

export function ExportDetailPage(props: Readonly<{ exportId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.exports.read"]}>
      <AuthorizedExportDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedExportDetailPage({
  exportId,
}: Readonly<{ exportId: string }>) {
  const exportQuery = useDataExport(exportId);

  return (
    <>
      {exportQuery.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {exportQuery.error ? (
        <ErrorState
          description={
            isAtlasApiError(exportQuery.error)
              ? exportQuery.error.message
              : "No se pudo cargar la exportación."
          }
          requestId={
            isAtlasApiError(exportQuery.error)
              ? exportQuery.error.requestId
              : undefined
          }
          onRetry={() => void exportQuery.refetch()}
        />
      ) : null}
      {exportQuery.data ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Exportación"
            title={exportQuery.data.name}
            description="Detalle de política aplicada, filtros, vencimiento y auditoría de la exportación."
            actions={
              <ExportDownloadAction
                downloadUrl={exportQuery.data.downloadUrl}
                expiresAt={exportQuery.data.expiresAt}
              />
            }
          />
          <Card>
            <CardHeader>
              <StatusBadge value={exportQuery.data.status} />
            </CardHeader>
            <CardContent>
              <KeyValueGrid
                items={[
                  { label: "Recurso", value: exportQuery.data.resourceType },
                  {
                    label: "ID recurso",
                    value: exportQuery.data.resourceId,
                    mono: true,
                  },
                  { label: "Formato", value: exportQuery.data.format },
                  {
                    label: "Solicitado por",
                    value: exportQuery.data.requestedBy,
                  },
                  {
                    label: "Solicitado",
                    value: formatDateTime(exportQuery.data.requestedAt),
                  },
                  {
                    label: "Finalizado",
                    value: formatDateTime(exportQuery.data.finishedAt),
                  },
                  {
                    label: "Expira",
                    value: formatDateTime(exportQuery.data.expiresAt),
                  },
                  {
                    label: "Request ID",
                    value: exportQuery.data.auditRequestId,
                    mono: true,
                  },
                  { label: "Motivo", value: exportQuery.data.reason },
                ]}
              />
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <JsonViewer
              title="Filtros aplicados"
              value={exportQuery.data.filters}
            />
            <JsonViewer
              title="Política aplicada"
              value={exportQuery.data.policySnapshot}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
