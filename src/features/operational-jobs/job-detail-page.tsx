"use client";

import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { JobActions } from "./job-actions";
import { useJobRun } from "./hooks";

export function JobDetailPage(props: Readonly<{ jobRunId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["internal.jobs.read"]}>
      <AuthorizedJobDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedJobDetailPage({ jobRunId }: Readonly<{ jobRunId: string }>) {
  const job = useJobRun(jobRunId);

  return (
    <>
      {job.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {job.error ? (
        <ErrorState
          description={
            isAtlasApiError(job.error)
              ? job.error.message
              : "No se pudo cargar el job."
          }
          requestId={
            isAtlasApiError(job.error) ? job.error.requestId : undefined
          }
          onRetry={() => void job.refetch()}
        />
      ) : null}
      {job.data ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Job interno"
            title={job.data.name}
            description="Detalle operativo, payload sanitizado, resultado y logs de ejecución."
            actions={<JobActions jobRunId={jobRunId} />}
          />
          <Card>
            <CardHeader>
              <StatusBadge value={job.data.status} />
            </CardHeader>
            <CardContent>
              <KeyValueGrid
                items={[
                  { label: "Key", value: job.data.jobKey, mono: true },
                  { label: "Cola", value: job.data.queue },
                  { label: "Prioridad", value: job.data.priority },
                  { label: "Intentos", value: formatNumber(job.data.attempts) },
                  {
                    label: "Duración",
                    value: formatNumber(job.data.durationMs),
                  },
                  {
                    label: "Request ID",
                    value: job.data.requestId,
                    mono: true,
                  },
                  {
                    label: "Inicio",
                    value: formatDateTime(job.data.startedAt),
                  },
                  { label: "Fin", value: formatDateTime(job.data.finishedAt) },
                  {
                    label: "Creado",
                    value: formatDateTime(job.data.createdAt),
                  },
                ]}
              />
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <JsonViewer
              title="Payload sanitizado"
              value={job.data.payloadSummary}
            />
            <JsonViewer title="Resultado" value={job.data.resultSummary} />
          </div>
          <JsonViewer title="Logs" value={job.data.logs} />
        </div>
      ) : null}
    </>
  );
}
