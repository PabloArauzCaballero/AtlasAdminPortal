"use client";

import { Route } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { FlowDetailDrawer } from "../flow-detail-drawer";
import { useBusinessFlows } from "../hooks";
import { BusinessProcessCard } from "./business-process-card";

/**
 * Los procesos de negocio (`workflow-catalog`) leídos como historias funcionales: qué pasos
 * componen «alta de cuenta» o «recorrido hasta la decisión de crédito», en orden, y qué hace
 * cada uno por dentro según el catálogo de Flujos.
 */
export function BusinessFlowsPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedBusinessFlowsPage />
    </PermissionGate>
  );
}

function AuthorizedBusinessFlowsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const abierto = params.get("flow");
  const query = useBusinessFlows();

  const abrirFlujo = useCallback(
    (flowId: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (flowId) next.set("flow", flowId);
      else next.delete("flow");
      router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router],
  );

  const totals = query.data?.totals;
  return (
    <>
      <PageHeader
        icon={Route}
        eyebrow="Systems Ops · Flujos"
        title="Procesos de negocio"
        description="Los procesos declarados en el catálogo de flujos, paso a paso y en orden, con el flujo que implementa cada uno: su riesgo, si está verificado con corridas reales y si tiene test. Un paso sin flujo es una ruta declarada que el código ya no tiene."
        actions={
          <Link href="/internal/flows">
            <Button>Ver todos los flujos</Button>
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Procesos activos"
          value={totals?.processes ?? "—"}
          icon={Route}
          hint="Definiciones en estado activo"
        />
        <MetricCard
          label="Pasos"
          value={totals?.steps ?? "—"}
          hint="Con su endpoint declarado"
        />
        <MetricCard
          label="Pasos sin flujo"
          value={totals?.unlinked ?? "—"}
          tone={totals?.unlinked ? "warning" : "success"}
          hint="Rutas declaradas que el catálogo no tiene"
        />
      </div>
      {query.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudieron cargar los procesos."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data && !query.data.processes.length ? (
        <EmptyState
          title="No hay procesos activos en el catálogo"
          description="El catálogo de flujos (workflow_definitions) no tiene definiciones activas, o el artefacto de Flujos aún no se cargó."
        />
      ) : null}
      <div className="space-y-4">
        {query.data?.processes.map((process) => (
          <BusinessProcessCard
            key={process.workflowCode}
            process={process}
            onOpenFlow={abrirFlujo}
          />
        ))}
      </div>
      <FlowDetailDrawer flowId={abierto} onClose={() => abrirFlujo(null)} />
    </>
  );
}
