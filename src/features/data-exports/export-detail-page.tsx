"use client";

import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatNumber } from "@/shared/lib/format";
import { useDataExport } from "./hooks";
import { ExportDownloadButton } from "./export-download-button";
import { Download } from "lucide-react";

export function ExportDetailPage(props: Readonly<{ exportId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedExportDetailPage {...props} />
    </RoleGate>
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
            icon={Download}
            eyebrow="Exportación"
            title={exportQuery.data.name}
            description="Se descarga entero, en JSON, en el momento y con tu sesión. No queda guardado en Atlas."
            actions={
              <ExportDownloadButton
                downloadUrl={exportQuery.data.downloadUrl}
                fileName={exportQuery.data.exportId}
              />
            }
          />
          <Card>
            <CardContent>
              <KeyValueGrid
                items={[
                  {
                    label: "Filas",
                    value: formatNumber(exportQuery.data.metadata?.rows ?? 0),
                  },
                  { label: "Formato", value: exportQuery.data.format },
                  { label: "Para qué sirve", value: exportQuery.data.reason },
                  {
                    label: "Datos personales",
                    value:
                      exportQuery.data.policySnapshot?.masking === "no_raw_pii"
                        ? "No incluye datos personales en claro"
                        : "Sin política de enmascarado declarada",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
