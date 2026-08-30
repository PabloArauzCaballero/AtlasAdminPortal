"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST, RUNTIME_JOB_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { buildDomainEventColumns } from "./event-columns";
import { PublishEventDialog } from "./publish-event-dialog";
import { useDomainEvents, useEventCatalog } from "./hooks";

const LIMITE = 20;

/**
 * Outbox de eventos de dominio.
 *
 * La pantalla que faltaba para el módulo que promete «reintentos auditables sin perder eventos»:
 * hasta ahora un evento fallido no se veía sin abrir la base, y reintentarlo o cancelarlo eran
 * llamadas sueltas que nadie podía hacer desde la consola.
 *
 * **No hay total de registros y no se finge uno.** El endpoint devuelve `{data, pagination}` y el
 * cliente del portal se queda con `data`, así que aquí no llega el total. Se pagina por lo único
 * que se sabe de verdad: si vino una página llena, puede haber otra.
 */
export function DomainEventsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedDomainEventsPage />
    </RoleGate>
  );
}

function AuthorizedDomainEventsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [publicando, setPublicando] = useState(false);

  const eventos = useDomainEvents({
    page,
    limit: LIMITE,
    ...(status ? { status } : {}),
    ...(eventCode ? { eventCode } : {}),
  });
  const catalogo = useEventCatalog();
  const items = useMemo(() => eventos.data ?? [], [eventos.data]);
  const columns = useMemo(() => buildDomainEventColumns(), []);
  const hayMas = items.length === LIMITE;

  const definiciones = useMemo(() => catalogo.data ?? [], [catalogo.data]);
  const opcionesCodigo = useMemo(
    () =>
      definiciones.length
        ? definiciones.map((d) => ({ value: d.eventCode, label: d.eventCode }))
        : uniqueTextOptions(items.map((item) => item.eventCode)),
    [definiciones, items],
  );

  return (
    <>
      <PageHeader
        icon={Radio}
        eyebrow="Eventos de dominio"
        title="Outbox de eventos"
        description="Qué publicó cada módulo, qué se procesó y qué quedó atascado. Reintentar y cancelar son decisiones de negocio y quedan auditadas."
      />
      <FilterBar
        search={eventCode}
        searchPlaceholder="Filtrar por código de evento…"
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: uniqueTextOptions(items.map((item) => item.status)),
          },
          {
            name: "eventCode",
            label: "Código",
            value: eventCode,
            options: opcionesCodigo,
          },
        ]}
        onSearchChange={(value) => {
          setEventCode(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "eventCode") setEventCode(value);
          setPage(1);
        }}
        onClear={() => {
          setStatus("");
          setEventCode("");
          setPage(1);
        }}
      />

      {eventos.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {eventos.error ? (
        <ErrorState
          description={
            isAtlasApiError(eventos.error)
              ? eventos.error.message
              : "No se pudieron cargar los eventos de dominio."
          }
          requestId={
            isAtlasApiError(eventos.error) ? eventos.error.requestId : undefined
          }
          onRetry={() => void eventos.refetch()}
        />
      ) : null}

      {eventos.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="En pantalla" value={formatNumber(items.length)} />
            <MetricCard
              label="Fallidos"
              value={formatNumber(
                items.filter((item) => item.status?.toUpperCase() === "FAILED").length,
              )}
            />
            <MetricCard
              label="Pendientes"
              value={formatNumber(
                items.filter((item) => item.status?.toUpperCase() === "PENDING").length,
              )}
            />
            <MetricCard
              label="Definiciones"
              value={formatNumber(definiciones.length)}
            />
          </section>

          <RoleGate roles={RUNTIME_JOB_ROLE_LIST}>
            <div className="flex justify-end">
              <Button onClick={() => setPublicando(true)}>Publicar evento</Button>
            </div>
          </RoleGate>

          <DataTable
            data={items}
            columns={columns}
            emptyTitle="No hay eventos con estos filtros."
            emptyDescription="El outbox vacío para un filtro no es un fallo: puede que ese código no se haya publicado nunca."
          />

          <div className="flex items-center justify-between text-sm text-atlas-muted">
            <span>Página {page}</span>
            <div className="flex gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((actual) => Math.max(1, actual - 1))}
              >
                Anterior
              </Button>
              <Button disabled={!hayMas} onClick={() => setPage((actual) => actual + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PublishEventDialog
        open={publicando}
        definiciones={definiciones}
        onClose={() => setPublicando(false)}
      />
    </>
  );
}
