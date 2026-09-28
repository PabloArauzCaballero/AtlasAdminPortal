"use client";

import { useMemo, useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { buildAlertColumns } from "./alert-columns";
import { useAlerts } from "./hooks";
import { Siren } from "lucide-react";

/*
 * Opciones fijas y no sacadas de la página visible: un desplegable armado con las 20 filas de la
 * página no ofrece «Crítica» si las críticas están en la página 3. Son los valores que publica
 * `GET /internal/alerts` (en mayúsculas), y el backend ya los filtra en vez de ignorarlos.
 */
const SEVERITY_OPTIONS: Option[] = [
  {
    value: "CRITICAL",
    label: "Crítica",
    description: "La regla marca un dato que no puede quedar así.",
  },
  {
    value: "HIGH",
    label: "Alta",
    description: "Conviene revisarla hoy mismo.",
  },
  {
    value: "MEDIUM",
    label: "Media",
    description: "Revisar en la operación normal.",
  },
  {
    value: "LOW",
    label: "Baja",
    description: "Informativa; no bloquea nada.",
  },
];

const STATUS_OPTIONS: Option[] = [
  { value: "OPEN", label: "Abierta", description: "Nadie la ha revisado." },
  {
    value: "ACKNOWLEDGED",
    label: "Reconocida",
    description: "Alguien ya la vio desde esta pantalla.",
  },
  {
    value: "RESOLVED",
    label: "Resuelta",
    description: "El dato ya se corrigió y se cerró.",
  },
];

/*
 * Sin filtros y sin filas, lo que hay que decir es por qué: en AtlasBackend nada inserta todavía en
 * `data_quality_issues` —el job «Recalcular calidad de datos» sólo CUENTA las abiertas—, así que la
 * bandeja vacía no significa «todo en orden».
 */
const NO_ALERTS_YET =
  "Hoy ningún proceso las crea solo: las reglas de calidad existen, pero todavía no se evalúan de forma automática.";

export function AlertsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedAlertsPage />
    </RoleGate>
  );
}

function AuthorizedAlertsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const alerts = useAlerts({ page, limit: 20, q, severity, status });
  const items = useMemo(() => alerts.data?.items ?? [], [alerts.data]);
  const columns = useMemo(() => buildAlertColumns(), []);

  return (
    <>
      <PageHeader
        icon={Siren}
        eyebrow="Alertas operativas"
        title="Alertas operativas"
        description="Incidencias de calidad de datos: qué regla las levantó, sobre qué registro y si alguien ya las reconoció."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar alerta, fuente o recurso…"
        filters={[
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: SEVERITY_OPTIONS,
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: STATUS_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "severity") setSeverity(value);
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setSeverity("");
          setStatus("");
          setPage(1);
        }}
      />
      {alerts.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {alerts.error ? (
        <ErrorState
          description={
            isAtlasApiError(alerts.error)
              ? alerts.error.message
              : "No se pudieron cargar alertas operativas."
          }
          requestId={
            isAtlasApiError(alerts.error) ? alerts.error.requestId : undefined
          }
          onRetry={() => void alerts.refetch()}
        />
      ) : null}
      {alerts.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Alertas"
              value={formatNumber(alerts.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="Críticas"
              value={formatNumber(
                items.filter(
                  (item) => item.severity?.toUpperCase() === "CRITICAL",
                ).length,
              )}
            />
            <MetricCard
              label="Sin reconocer"
              value={formatNumber(
                items.filter((item) => !item.acknowledgedAt).length,
              )}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={alerts.data.meta}
            onPageChange={setPage}
            emptyTitle={
              q || severity || status
                ? "No hay alertas para los filtros actuales."
                : "No hay incidencias registradas."
            }
            emptyDescription={
              q || severity || status
                ? "Prueba a quitar algún filtro."
                : NO_ALERTS_YET
            }
          />
        </div>
      ) : null}
    </>
  );
}
