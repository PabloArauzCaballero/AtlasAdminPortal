"use client";

import { ArrowLeft, ListChecks, Workflow } from "lucide-react";
import Link from "next/link";
import { isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useProcess } from "./hooks";
import { processTypeLabel, roleLabel, systemLabel } from "./labels";
import { ProcessDocumentation } from "./process-documentation";
import { ProcessNarrative } from "./process-narrative";
import { ProcessStages } from "./process-stages";
import { PROCESSES_PERMISSION } from "./services";
import { UnwiredCallout } from "./unwired-callout";

export function ProcessDetailPage({ code }: Readonly<{ code: string }>) {
  return (
    <PermissionGate permissions={[PROCESSES_PERMISSION]}>
      <AuthorizedProcessDetail code={code} />
    </PermissionGate>
  );
}

export function BackToProcesses() {
  return (
    <Link
      href="/internal/procesos"
      className="inline-flex items-center gap-1 text-sm text-atlas-accent underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Todos los procesos
    </Link>
  );
}

function AuthorizedProcessDetail({ code }: Readonly<{ code: string }>) {
  const process = useProcess(code);

  if (process.isLoading) return <LoadingSkeleton rows={8} />;
  if (process.error) {
    if (isAtlasApiError(process.error) && process.error.status === 404)
      return (
        <EmptyState
          title="Este proceso no existe"
          description="Puede que el enlace esté mal copiado o que el proceso se haya renombrado."
          action={<BackToProcesses />}
        />
      );
    return (
      <ErrorState
        title="No se pudo cargar el proceso."
        description={
          isAtlasApiError(process.error)
            ? process.error.message
            : "Revisa la conexión y vuelve a intentarlo."
        }
        requestId={
          isAtlasApiError(process.error) ? process.error.requestId : undefined
        }
        onRetry={() => void process.refetch()}
      />
    );
  }
  const data = process.data;
  if (!data) return null;
  const hasInstances = data.instanceEntity?.system === "ATLAS_BACKEND";

  return (
    <>
      <div className="mb-3">
        <BackToProcesses />
      </div>
      <PageHeader
        icon={Workflow}
        eyebrow={`Proceso ${data.processId}`}
        title={data.name}
        description={data.description}
        actions={
          hasInstances ? (
            <Link
              href={`/internal/procesos/${data.code}/instancias`}
              className="inline-flex items-center gap-2 rounded-lg border border-atlas-border bg-white px-3 py-2 text-sm font-medium text-atlas-text shadow-subtle hover:bg-atlas-soft"
            >
              <ListChecks className="h-4 w-4" aria-hidden />
              Casos en curso
            </Link>
          ) : null
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={data.priority === "P0" ? "critical" : "default"}>
          {`Prioridad ${data.priority}`}
        </Badge>
        <Badge tone="info">{processTypeLabel(data.processType)}</Badge>
        <Badge tone="default">{`Dueño: ${roleLabel(data.ownerRole)}`}</Badge>
        {data.systems.map((system) => (
          <Badge key={system} tone="muted">
            {systemLabel(system)}
          </Badge>
        ))}
      </div>
      <UnwiredCallout code={data.code} />
      <ProcessNarrative process={data} />
      <ProcessStages stages={data.stages} />
      <ProcessDocumentation process={data} />
    </>
  );
}
