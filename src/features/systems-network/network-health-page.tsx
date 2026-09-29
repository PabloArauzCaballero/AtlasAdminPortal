"use client";

import { AlertTriangle, Network, RefreshCw, Share2 } from "lucide-react";
import {
  useFederateBlocksMutation,
  useNetworkHealth,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatDateTime } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { NetworkBlocksTable } from "./network-blocks-table";
import {
  blockDisplayName,
  catalogStatusCopy,
  isCatalogUpToDate,
  pluralSystems,
} from "./network-status-copy";

export function NetworkHealthPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.network.read"]}>
      <AuthorizedNetworkHealthPage />
    </PermissionGate>
  );
}

function AuthorizedNetworkHealthPage() {
  const network = useNetworkHealth();
  const federate = useFederateBlocksMutation();
  const report = network.data;
  const blocks = report?.blocks ?? [];
  const downBlocks = blocks.filter((block) => block.liveState === "DOWN");
  // El propio núcleo también cuenta: si no ha leído sus rutas, su «0» no es un dato.
  const staleBlocks = blocks.filter(
    (block) => !isCatalogUpToDate(block.catalog.federationStatus),
  );
  const nameOf = (systemCode: string) => {
    const block = blocks.find((item) => item.systemCode === systemCode);
    return block ? blockDisplayName(block) : systemCode;
  };
  const kindOf = (systemCode: string) =>
    blocks.find((item) => item.systemCode === systemCode)?.kind ?? "FEDERATED";

  return (
    <>
      <PageHeader
        icon={Network}
        title="Salud de la red"
        description="Si los tres sistemas de Atlas —el núcleo, el motor de decisiones y el ERP— están respondiendo, si cada uno ha entregado su lista de rutas y tablas, y qué se pierde cuando falta uno. Se actualiza cada 30 segundos."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => void federate.mutateAsync().catch(() => undefined)}
              isLoading={federate.isPending}
              loadingText="Pidiendo catálogos…"
            >
              <Share2 className="h-4 w-4" />
              Actualizar catálogos
            </Button>
            <Button
              onClick={() => void network.refetch()}
              isLoading={network.isFetching}
              loadingText="Actualizando…"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />
      <BusinessContextNote>
        «Salud de herramientas» contesta si responde cada pieza suelta —una
        librería, una tabla, un proveedor—. Esta pestaña contesta otra pregunta:
        si <strong>Atlas está completo</strong>. Un sistema puede estar en pie y
        aun así no haber entregado su lista de rutas y tablas; entonces el
        catálogo de datos se queda corto sin que nada lo avise. Las listas se
        piden solas al arrancar y cada pocas horas.
      </BusinessContextNote>

      {report ? (
        <p className="animate-fade-in text-xs text-atlas-muted">
          Última lectura: {formatDateTime(report.generatedAt)} ·{" "}
          {report.blocksUp} en pie · {report.blocksDown} caídos ·{" "}
          {report.blocksNotConfigured} sin configurar
        </p>
      ) : null}

      {downBlocks.length > 0 ? (
        <NetworkAlert
          tone="down"
          title={`${pluralSystems(downBlocks.length)} no ${downBlocks.length === 1 ? "responde" : "responden"}`}
          detail={downBlocks
            .map((block) => `${blockDisplayName(block)}: ${block.degradation}`)
            .join(" · ")}
        />
      ) : null}

      {staleBlocks.length > 0 ? (
        <NetworkAlert
          tone="stale"
          title={`El catálogo de ${pluralSystems(staleBlocks.length)} no está al día`}
          detail={staleBlocks
            .map(
              (block) =>
                `${blockDisplayName(block)}: ${catalogStatusCopy(block.kind, block.catalog.federationStatus).label.toLowerCase()}`,
            )
            .join(" · ")}
        />
      ) : null}

      {network.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {network.error ? (
        <ErrorState
          description={
            isAtlasApiError(network.error)
              ? network.error.message
              : "No se pudo cargar la salud de la red."
          }
          requestId={
            isAtlasApiError(network.error) ? network.error.requestId : undefined
          }
          onRetry={() => void network.refetch()}
        />
      ) : null}

      {federate.data ? (
        <div className="animate-fade-in rounded-xl border border-atlas-border bg-atlas-soft p-4 text-xs">
          <p className="font-semibold">Resultado de la actualización</p>
          <ul className="mt-2 space-y-1">
            {federate.data.map((outcome) => {
              const copy = catalogStatusCopy(
                kindOf(outcome.systemCode),
                outcome.status,
              );
              return (
                <li key={outcome.systemCode}>
                  <span className="font-semibold">
                    {nameOf(outcome.systemCode)}
                  </span>{" "}
                  · {copy.label}
                  {outcome.status === "OK"
                    ? ` — ${outcome.endpointsImported} endpoints y ${outcome.dataEntitiesImported} tablas.`
                    : ` — ${copy.explanation}`}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {report ? <NetworkBlocksTable blocks={blocks} /> : null}
    </>
  );
}

function NetworkAlert({
  tone,
  title,
  detail,
}: Readonly<{ tone: "down" | "stale"; title: string; detail: string }>) {
  const isDown = tone === "down";
  return (
    <div
      className={`animate-slide-up flex items-start gap-3 rounded-xl border p-4 ${
        isDown ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <AlertTriangle
        className={`mt-0.5 h-5 w-5 shrink-0 ${isDown ? "text-red-600" : "text-amber-600"}`}
      />
      <div className="min-w-0 text-sm">
        <p
          className={`font-semibold ${isDown ? "text-red-800" : "text-amber-800"}`}
        >
          {title}
        </p>
        <p
          className={`mt-1 break-words text-xs ${isDown ? "text-red-700" : "text-amber-700"}`}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}
