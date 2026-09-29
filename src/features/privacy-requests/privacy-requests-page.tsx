"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { usePrivacyRequests } from "./hooks";
import { OVERDUE_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS } from "./labels";
import { buildPrivacyRequestColumns } from "./privacy-request-columns";

export const PRIVACY_READ_PERMISSION = "privacy.requests.read";
export const PRIVACY_MANAGE_PERMISSION = "privacy.requests.manage";

/**
 * Solicitudes de derechos del titular (hallazgo A5).
 *
 * Antes la app creaba la solicitud y no había dónde verla: se quedaba «recibida» para siempre y el
 * plazo legal de 15 días vencía sin que nadie se enterara. Esta cola es ese «dónde». Arriba, lo
 * que importa para decidir por dónde empezar: cuántas hay abiertas y cuántas ya vencieron.
 *
 * El gate envuelve a un componente aparte: con los hooks aquí, las consultas saldrían antes de que
 * el gate decidiera y alguien sin permiso dispararía igual las peticiones.
 */
export function PrivacyRequestsPage() {
  return (
    <PermissionGate permissions={[PRIVACY_READ_PERMISSION]}>
      <AuthorizedPrivacyRequestsPage />
    </PermissionGate>
  );
}

const FILTROS_VACIOS = { status: "", type: "", overdue: "" };

function AuthorizedPrivacyRequestsPage() {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const solicitudes = usePrivacyRequests({
    page,
    pageSize: 25,
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.type ? { type: filtros.type } : {}),
    ...(filtros.overdue ? { overdue: filtros.overdue } : {}),
    ...(busqueda.trim() ? { q: busqueda.trim() } : {}),
  });
  const columns = useMemo(() => buildPrivacyRequestColumns(), []);
  const data = solicitudes.data;

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Gobierno de datos"
        title="Solicitudes de privacidad"
        description="Los pedidos de los clientes para ver, corregir, llevarse, limitar o borrar sus datos. Cada uno tiene 15 días naturales de plazo desde que llega."
      />
      <BusinessContextNote>
        Tomar una solicitud te deja como responsable; cerrarla (atendida o
        rechazada) exige escribir cómo se resolvió. Marcarla como atendida no
        borra nada: si el cliente pidió supresión, el borrado se hace a mano y
        respetando lo que la ley obliga a conservar (identidad, antifraude,
        historial de crédito).
      </BusinessContextNote>

      {data ? (
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Abiertas"
            value={formatNumber(data.summary.open)}
          />
          <MetricCard
            label="Vencidas"
            value={formatNumber(data.summary.overdue)}
          />
          <MetricCard
            label="Plazo legal"
            value={`${data.summary.dueDays} días`}
          />
        </section>
      ) : null}

      <FilterBar
        search={busqueda}
        searchPlaceholder="Código de solicitud o de cliente…"
        searchTooltip="Busca por parte del código de la solicitud o del código del cliente (CUS-…), sin distinguir mayúsculas."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: filtros.status,
            options: STATUS_OPTIONS,
            tooltip: "En qué punto de la atención está la solicitud.",
          },
          {
            name: "type",
            label: "Derecho",
            value: filtros.type,
            options: TYPE_OPTIONS,
            tooltip: "Qué derecho ejerce el cliente con su pedido.",
          },
          {
            name: "overdue",
            label: "Plazo",
            value: filtros.overdue,
            options: OVERDUE_OPTIONS,
            tooltip: "Separa las abiertas fuera de plazo del resto de la cola.",
          },
        ]}
        onSearchChange={(valor) => {
          setBusqueda(valor);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          setFiltros((actual) => ({ ...actual, [name]: value }));
          setPage(1);
        }}
        onClear={() => {
          setFiltros(FILTROS_VACIOS);
          setBusqueda("");
          setPage(1);
        }}
      />

      {solicitudes.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {solicitudes.error ? (
        <ErrorState
          description={
            isAtlasApiError(solicitudes.error)
              ? solicitudes.error.message
              : "No se pudo cargar la cola de solicitudes."
          }
          requestId={
            isAtlasApiError(solicitudes.error)
              ? solicitudes.error.requestId
              : undefined
          }
          onRetry={() => void solicitudes.refetch()}
        />
      ) : null}
      {data ? (
        <Card className="p-5">
          <DataTable
            data={data.items}
            columns={columns}
            meta={{
              page: data.meta.page,
              limit: data.meta.pageSize,
              total: data.meta.total,
              totalPages: data.meta.totalPages,
            }}
            onPageChange={setPage}
            emptyTitle="No hay solicitudes para estos filtros."
            emptyDescription="Si no filtraste nada, ningún cliente ha pedido ejercer sus derechos todavía."
          />
        </Card>
      ) : null}
    </>
  );
}
