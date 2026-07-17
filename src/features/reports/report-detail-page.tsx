"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { ReportRunCard } from "./report-run-card";
import { ReportSummaryCard } from "./report-summary-card";
import { ReportWidgetsCard } from "./report-widgets-card";
import { buildSnapshotColumns } from "./report-columns";
import { useReport, useReportSnapshots } from "./hooks";

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

function AuthorizedReportDetailPage({
  reportId,
}: Readonly<{ reportId: string }>) {
  const [page, setPage] = useState(1);
  const report = useReport(reportId);
  const snapshots = useReportSnapshots(reportId, { page, limit: 10 });
  const error = report.error ?? snapshots.error;
  const snapshotColumns = useMemo(() => buildSnapshotColumns(), []);

  return (
    <>
      <PageHeader
        eyebrow="Reportería dinámica"
        title="Detalle de reporte"
        description="Contratos, widgets, snapshots y ejecución auditada desde el servicio interno."
      />
      {report.isLoading || snapshots.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar el detalle del reporte."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void report.refetch();
            void snapshots.refetch();
          }}
        />
      ) : null}
      {report.data ? (
        <div className="space-y-6">
          <ReportSummaryCard report={report.data} />
          <ReportWidgetsCard widgets={report.data.widgets ?? []} />
          <ReportRunCard reportId={reportId} />
          {snapshots.data ? (
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Snapshots"
                  description="Historial de generaciones del reporte."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent>
                <DataTable
                  data={snapshots.data.items}
                  columns={snapshotColumns}
                  meta={snapshots.data.meta}
                  onPageChange={setPage}
                  emptyTitle="Este reporte todavía no tiene snapshots."
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
