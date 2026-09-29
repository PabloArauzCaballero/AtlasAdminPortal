"use client";

import { ArrowLeft, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { FlowDetailDrawer } from "@/features/flows/flow-detail-drawer";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { Badge } from "@/shared/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useProcess } from "./hooks";
import { processTypeLabel, roleLabel, systemLabel } from "./labels";
import { ProcessCasesTab } from "./process-cases-tab";
import { ProcessDocumentation } from "./process-documentation";
import { ProcessFlowCounters } from "./process-flow-counters";
import { ProcessNarrative } from "./process-narrative";
import { ProcessStages } from "./process-stages";
import { FLOWS_PERMISSION, PROCESSES_PERMISSION } from "./services";
import type { ProcessDetail } from "./types";
import { UnwiredCallout } from "./unwired-callout";

/**
 * Las pestañas de la ficha y su valor en `?tab=`. «Pasos y flujos» absorbe lo que enseñaba la
 * pantalla «Procesos de negocio» (prueba, opcional, críticos, verificados y la ficha técnica del
 * flujo) y «Casos en curso» es la antigua `/instancias`: las dos rutas viejas redirigen aquí.
 */
export const PROCESS_TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "pasos", label: "Pasos y flujos" },
  { key: "casos", label: "Casos en curso" },
  { key: "documentacion", label: "Documentación y cableado" },
] as const;

type TabKey = (typeof PROCESS_TABS)[number]["key"];

export function tabFromParam(value: string | null): TabKey {
  return PROCESS_TABS.find((tab) => tab.key === value)?.key ?? "resumen";
}

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
  return process.data ? <ProcessDetailBody data={process.data} /> : null;
}

function ProcessDetailBody({ data }: Readonly<{ data: ProcessDetail }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canSeeFlows = hasPermission(FLOWS_PERMISSION);
  const [openFlow, setOpenFlow] = useState<string | null>(null);
  const tab = tabFromParam(searchParams.get("tab"));
  const hasInstances = data.instanceEntity?.system === "ATLAS_BACKEND";

  const selectTab = useCallback(
    (label: string) => {
      const key =
        PROCESS_TABS.find((item) => item.label === label)?.key ?? "resumen";
      const next = new URLSearchParams();
      if (key !== "resumen") next.set("tab", key);
      router.replace(next.size ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

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
      <DetailTabs
        tabs={PROCESS_TABS.map((item) => item.label)}
        active={PROCESS_TABS.find((item) => item.key === tab)!.label}
        onChange={selectTab}
      />
      {tab === "resumen" ? (
        <>
          <ProcessFlowCounters process={data} />
          <ProcessNarrative process={data} />
        </>
      ) : null}
      {tab === "pasos" ? (
        <>
          <ProcessFlowCounters process={data} />
          <ProcessStages
            stages={data.stages}
            onOpenFlow={canSeeFlows ? setOpenFlow : undefined}
          />
        </>
      ) : null}
      {tab === "casos" ? (
        hasInstances ? (
          <ProcessCasesTab code={data.code} />
        ) : (
          <EmptyState
            title="Los casos de este proceso no se ven desde aquí"
            description={
              data.instanceEntity
                ? "Sus casos viven en otro bloque de Atlas y se consultan en su propio portal."
                : "Este proceso no declara dónde viven sus casos."
            }
          />
        )
      ) : null}
      {tab === "documentacion" ? (
        <>
          <UnwiredCallout code={data.code} />
          <ProcessDocumentation process={data} />
        </>
      ) : null}
      {canSeeFlows ? (
        <FlowDetailDrawer flowId={openFlow} onClose={() => setOpenFlow(null)} />
      ) : null}
    </>
  );
}
