"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  INTERNAL_PORTAL_ROLE_LIST,
  RUNTIME_JOB_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { buildDomainEventColumns } from "./event-columns";
import { PublishEventDialog } from "./publish-event-dialog";
import { useDomainEvents, useEventCatalog } from "./hooks";
import { OUTBOX_EVENT_STATUSES } from "./types";

const LIMITE = 20;

/**
 * Outbox de eventos de dominio.
 *
 * La pantalla que faltaba para el módulo que promete «reintentos auditables sin perder eventos»:
 * hasta ahora un evento fallido no se veía sin abrir la base, y reintentarlo o cancelarlo eran
 * llamadas sueltas que nadie podía hacer desde la consola.
 *
 * ## Por qué no se abría
 *
 * El listado llega como `{ data, pagination }` dentro del sobre global, y el cliente sólo
 * desenvuelve un nivel: la pantalla recibía un OBJETO donde esperaba un array y moría en el primer
 * `.filter`. El catálogo, por su parte, llama `code` a lo que aquí se llama `eventCode`, así que el
 * desplegable de publicar salía vacío. Las dos traducciones viven en `services.ts`; esta vista ya
 * trabaja con `{ items, meta }` como el resto del portal, y pagina con el TOTAL real.
 */
export function DomainEventsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedDomainEventsPage />
    </RoleGate>
  );
}

const OPCIONES_ESTADO = OUTBOX_EVENT_STATUSES.map((estado) => ({
  value: estado,
  label: estado,
}));

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
  const items = useMemo(() => eventos.data?.items ?? [], [eventos.data]);
  const columns = useMemo(() => buildDomainEventColumns(), []);

  const definiciones = useMemo(() => catalogo.data ?? [], [catalogo.data]);
  const opcionesCodigo = useMemo(
    () =>
      definiciones.map((d) => ({ value: d.eventCode, label: d.eventCode })),
    [definiciones],
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
            options: OPCIONES_ESTADO,
          },
          {
            name: "eventCode",
            label: "Código del catálogo",
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
            <MetricCard
              label="Total con este filtro"
              value={formatNumber(eventos.data.meta.total)}
            />
            <MetricCard
              label="Fallidos en esta página"
              value={formatNumber(
                items.filter((item) => item.status?.toLowerCase() === "failed")
                  .length,
              )}
            />
            <MetricCard
              label="Pendientes en esta página"
              value={formatNumber(
                items.filter(
                  (item) => item.status?.toLowerCase() === "pending",
                ).length,
              )}
            />
            <MetricCard
              label="Definiciones del catálogo"
              value={formatNumber(definiciones.length)}
            />
          </section>

          <RoleGate roles={RUNTIME_JOB_ROLE_LIST}>
            <div className="flex justify-end">
              <Button onClick={() => setPublicando(true)}>
                Publicar evento
              </Button>
            </div>
          </RoleGate>

          <DataTable
            data={items}
            columns={columns}
            meta={eventos.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay eventos con estos filtros."
            emptyDescription="El outbox vacío para un filtro no es un fallo: puede que ese código no se haya publicado nunca. Ojo: la mayoría de filas son comandos de la API (aggregate «api_command») y no están en el catálogo."
          />
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
