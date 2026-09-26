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
import { NetworkBlockCard } from "./network-block-card";

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
  const staleBlocks = blocks.filter(
    (block) => block.kind !== "SELF" && block.catalog.federationStatus !== "OK",
  );

  return (
    <>
      <PageHeader
        icon={Network}
        title="Salud de la red"
        description="Estado de LOS TRES bloques del ecosistema desde `/systems/health/network`: si responden, qué aportan al catálogo y qué se pierde cuando falta uno. Se actualiza cada 30s."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => void federate.mutateAsync().catch(() => undefined)}
              isLoading={federate.isPending}
              loadingText="Federando…"
            >
              <Share2 className="h-4 w-4" />
              Refederar catálogo
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
        si el <strong>ecosistema está completo</strong>. Un bloque en pie que
        lleva días sin federar su catálogo se veía antes exactamente igual que
        uno sano, porque nadie preguntaba de dónde salían las tablas que el
        portal enseñaba.
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
          title={`${downBlocks.length} bloque(s) del ecosistema no responden`}
          detail={downBlocks
            .map((block) => `${block.name}: ${block.degradation}`)
            .join(" · ")}
        />
      ) : null}

      {staleBlocks.length > 0 ? (
        <NetworkAlert
          tone="stale"
          title={`${staleBlocks.length} bloque(s) no están aportando su catálogo`}
          detail={staleBlocks
            .map(
              (block) =>
                `${block.name}: ${block.catalog.federationMessage ?? block.catalog.federationStatus}`,
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
          <p className="font-semibold">Resultado de la última federación</p>
          <ul className="mt-2 space-y-1">
            {federate.data.map((outcome) => (
              <li key={outcome.systemCode}>
                <span className="font-mono">{outcome.systemCode}</span> ·{" "}
                <span className="font-semibold">{outcome.status}</span> —{" "}
                {outcome.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {blocks.map((block) => (
            <NetworkBlockCard key={block.systemCode} block={block} />
          ))}
        </div>
      ) : null}
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
