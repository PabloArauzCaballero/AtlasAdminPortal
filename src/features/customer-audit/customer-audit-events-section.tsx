"use client";

import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { buildCustomerAuditEventsColumns } from "./customer-audit-events-columns";
import {
  CustomerAuditFilters,
  toIsoDateTime,
  type CustomerAuditFiltersValue,
} from "./customer-audit-filters";
import { DeprecatedRouteNotice } from "./deprecated-route-notice";
import { CUSTOMER_AUDIT_PAGE_SIZE, useCustomerAuditEvents } from "./hooks";

const emptyFilters: CustomerAuditFiltersValue = {
  eventType: "all",
  from: "",
  to: "",
};

export function CustomerAuditEventsSection({
  customerId,
}: Readonly<{ customerId: string }>) {
  const [filters, setFilters] = useState<CustomerAuditFiltersValue>(
    () => emptyFilters,
  );
  const [page, setPage] = useState(1);
  const columns = useMemo(() => buildCustomerAuditEventsColumns(), []);

  const events = useCustomerAuditEvents(customerId, {
    eventType: filters.eventType,
    from: toIsoDateTime(filters.from),
    to: toIsoDateTime(filters.to),
    page,
    limit: CUSTOMER_AUDIT_PAGE_SIZE,
  });

  return (
    <>
      <SectionHeader
        title="Historial filtrado"
        description="Misma auditoría, servida por la ruta anterior: agrega un resumen por evento y filtros por tipo y rango de fechas, a cambio de una paginación menos confiable."
      />
      <DeprecatedRouteNotice eventType={filters.eventType} />
      <CustomerAuditFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        onClear={() => {
          setFilters(emptyFilters);
          setPage(1);
        }}
      />
      {events.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {events.error ? (
        <ErrorState
          description={
            isAtlasApiError(events.error)
              ? events.error.message
              : `No se pudo cargar el historial de auditoría del cliente #${customerId}.`
          }
          requestId={
            isAtlasApiError(events.error) ? events.error.requestId : undefined
          }
          onRetry={() => void events.refetch()}
        />
      ) : null}
      {events.data ? (
        <DataTable
          data={events.data.events}
          columns={columns}
          meta={events.data.meta}
          onPageChange={setPage}
          emptyTitle="Sin eventos para este filtro."
          emptyDescription="Probá con «Todos» o ampliá el rango de fechas."
        />
      ) : null}
    </>
  );
}
