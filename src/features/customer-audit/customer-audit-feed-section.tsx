"use client";

import { useMemo } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { buildCustomerAuditFeedColumns } from "./customer-audit-feed-columns";
import { useCustomerAuditFeed } from "./hooks";

export function CustomerAuditFeedSection({
  customerId,
}: Readonly<{ customerId: string }>) {
  const feed = useCustomerAuditFeed(customerId);
  const columns = useMemo(() => buildCustomerAuditFeedColumns(), []);
  const events = useMemo(
    () => feed.data?.pages.flatMap((page) => page.events) ?? [],
    [feed.data],
  );

  return (
    <>
      <SectionHeader
        title="Feed de auditoría"
        description="Todas las fuentes de auditoría del cliente (auditoría operativa, cambios de datos, autenticación, consentimientos, acciones, estados, fraude y revisión manual), ordenadas de más reciente a más antigua."
      />
      {feed.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {feed.error ? (
        <ErrorState
          description={
            isAtlasApiError(feed.error)
              ? feed.error.message
              : `No se pudo cargar el feed de auditoría del cliente #${customerId}.`
          }
          requestId={
            isAtlasApiError(feed.error) ? feed.error.requestId : undefined
          }
          onRetry={() => void feed.refetch()}
        />
      ) : null}
      {feed.data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Eventos cargados"
              value={events.length}
              hint={
                feed.hasNextPage
                  ? "Hay más eventos disponibles: usá «Cargar más»."
                  : "Fin del historial: no hay más eventos."
              }
            />
            <MetricCard
              label="Fuentes cubiertas"
              value={8}
              hint="Paginado por cursor real sobre la vista audit_event_feed."
            />
          </div>
          {/* Sin `meta`: el feed por cursor no devuelve total ni número de página,
              así que no se le pasa paginación por offset a la tabla. */}
          <DataTable
            data={events}
            columns={columns}
            emptyTitle="Sin eventos de auditoría para este cliente."
            emptyDescription="Todavía no hay actividad registrada en ninguna de las 8 fuentes de auditoría."
          />
          {feed.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                isLoading={feed.isFetchingNextPage}
                loadingText="Cargando…"
                onClick={() => void feed.fetchNextPage()}
              >
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
