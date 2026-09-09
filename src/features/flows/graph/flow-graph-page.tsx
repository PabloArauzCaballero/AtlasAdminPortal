"use client";

import { Waypoints } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { FlowDetailDrawer } from "../flow-detail-drawer";
import { useFlowGraph, useModuleGraph } from "../hooks";
import { FlowGraphView } from "./flow-graph-view";

/**
 * `/internal/flows/graph?flow=flow_…` dibuja un flujo; `?systemCode=…&module=…` dibuja el módulo
 * entero (clientes y controllers compartidos). `&roles=1` añade los roles al grafo de módulo.
 * `&open=flow_…` abre la ficha de un flujo encima del grafo (enlace profundo).
 */
export function FlowGraphPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedFlowGraphPage />
    </PermissionGate>
  );
}

function AuthorizedFlowGraphPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const flowId = params.get("flow");
  const systemCode = params.get("systemCode");
  const moduleName = params.get("module");
  const includeRoles = params.get("roles") === "1";
  const openFlowId = params.get("open");

  const flowGraph = useFlowGraph(flowId);
  const moduleGraph = useModuleGraph(systemCode, moduleName, includeRoles);
  const query = flowId ? flowGraph : moduleGraph;
  const title = flowId
    ? "Grafo del flujo"
    : `Grafo del módulo ${moduleName ?? ""}`;

  const setOpen = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("open", id);
      else next.delete("open");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  if (!flowId && !(systemCode && moduleName)) {
    return (
      <ErrorState description="Indica un flujo (?flow=) o un bloque y módulo (?systemCode=&module=)." />
    );
  }

  return (
    <>
      <PageHeader
        icon={Waypoints}
        eyebrow="Systems Ops · Flujos"
        title={title}
        description={
          flowId
            ? "Cliente → endpoint → autorización → handler. Lo que la fase 1 no resuelve (service y tablas) aparece como nodo punteado «sin resolver», nunca como un hecho."
            : "Todos los flujos del módulo compartiendo clientes y controllers. Pulsa un endpoint para abrir su ficha; busca un nodo para centrarlo; selecciona para resaltar su camino."
        }
        actions={
          <div className="flex gap-2">
            {!flowId && systemCode && moduleName ? (
              <Link
                href={`${pathname}?systemCode=${systemCode}&module=${moduleName}${includeRoles ? "" : "&roles=1"}`}
              >
                <Button>
                  {includeRoles ? "Ocultar roles" : "Mostrar roles"}
                </Button>
              </Link>
            ) : null}
            <Link href="/internal/flows">
              <Button>Volver a la tabla</Button>
            </Link>
          </div>
        }
      />
      {query.isLoading ? <LoadingSkeleton rows={10} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar el grafo."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <FlowGraphView graph={query.data} onSelectFlow={setOpen} />
      ) : null}
      <FlowDetailDrawer flowId={openFlowId} onClose={() => setOpen(null)} />
    </>
  );
}
