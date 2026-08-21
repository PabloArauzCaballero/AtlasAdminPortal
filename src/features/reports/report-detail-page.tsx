"use client";

import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { ReportRunCard } from "./report-run-card";
import { ReportSummaryCard } from "./report-summary-card";
import { ReportWidgetsCard } from "./report-widgets-card";
import { useReport } from "./hooks";
import { ChartColumn } from "lucide-react";

export function ReportDetailPage(props: Readonly<{ reportId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["reporting.read"]}>
      <AuthorizedReportDetailPage {...props} />
    </PermissionGate>
  );
}

/**
 * Ya no se piden "snapshots".
 *
 * `GET /internal/reports/:id/snapshots` fue RETIRADO del backend junto con los demás endpoints que
 * contestaban 200 sobre algo que no ocurría: no existe tabla de snapshots y `POST .../run` devuelve
 * `persisted: false` porque calcula el reporte en vivo. El portal seguía llamándolo, así que cada
 * ficha de reporte abría con un 404 pintado como "No se pudo cargar el detalle del reporte" —el
 * detalle SÍ había cargado— y debajo una tarjeta "Snapshots" prometiendo un historial inexistente.
 */
function AuthorizedReportDetailPage({
  reportId,
}: Readonly<{ reportId: string }>) {
  const report = useReport(reportId);

  return (
    <>
      <PageHeader
        icon={ChartColumn}
        eyebrow="Reportería dinámica"
        title={report.data?.name ?? "Detalle de reporte"}
        description="Contrato, widgets y ejecución auditada del reporte. Se computa en vivo sobre los datos del tenant: no se archiva ninguna copia."
      />
      {report.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {report.error ? (
        <ErrorState
          description={
            isAtlasApiError(report.error)
              ? report.error.message
              : "No se pudo cargar el detalle del reporte."
          }
          requestId={
            isAtlasApiError(report.error) ? report.error.requestId : undefined
          }
          onRetry={() => void report.refetch()}
        />
      ) : null}
      {report.data ? (
        <div className="space-y-6">
          <ReportSummaryCard report={report.data} />
          <ReportWidgetsCard widgets={report.data.widgets ?? []} />
          <ReportRunCard reportId={reportId} />
        </div>
      ) : null}
    </>
  );
}
