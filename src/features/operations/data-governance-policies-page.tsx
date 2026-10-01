"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { Scale } from "lucide-react";
import { buildGovernancePolicyColumns } from "./governance-policy-columns";
import {
  GOVERNANCE_POLICY_TYPE_OPTIONS,
  useGovernancePolicySearch,
} from "./governance-policy-search";
import { usePageSize } from "@/shared/lib/page-size";

export function DataGovernancePoliciesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["governance.policies.read"]}>
      <AuthorizedDataGovernancePoliciesPage />
    </PermissionGate>
  );
}

/**
 * Antes: seis listas enteras pintadas como un muro de tarjetas, sin buscador, filtro ni páginas, y
 * las tarjetas de arriba contaban esas listas. Ahora es una tabla paginada en el servidor con `q`
 * (código, nombre o alcance) y tipo, y las cifras salen del `summary` del filtro entero.
 */
function AuthorizedDataGovernancePoliciesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const policies = useGovernancePolicySearch({
    page,
    limit: usePageSize(20),
    q,
    type,
  });
  const columns = useMemo(() => buildGovernancePolicyColumns(), []);
  const summary = policies.data?.summary;
  const filtered = Boolean(q || type);

  return (
    <>
      <PageHeader
        icon={Scale}
        eyebrow="Políticas de gobierno"
        title="Políticas de gobierno"
        description="Propósitos de tratamiento, retenciones, clasificaciones, campos sensibles y reglas de calidad activas, en una sola lista."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o alcance…"
        searchTooltip="Busca el texto dentro del código, el nombre o el alcance de la política."
        filters={[
          {
            name: "type",
            label: "Tipo",
            tooltip:
              "Qué clase de política: propósito, retención, clasificación, campo sensible o calidad.",
            value: type,
            options: GOVERNANCE_POLICY_TYPE_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "type") setType(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setType("");
          setPage(1);
        }}
      />
      {policies.error ? (
        <ErrorState
          description={
            isAtlasApiError(policies.error)
              ? policies.error.message
              : "No se pudieron cargar las políticas de gobierno."
          }
          requestId={
            isAtlasApiError(policies.error)
              ? policies.error.requestId
              : undefined
          }
          onRetry={() => void policies.refetch()}
        />
      ) : null}
      <div className="space-y-6">
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Políticas" value={formatNumber(summary?.total)} />
          <MetricCard
            label="Campos sensibles"
            value={formatNumber(summary?.sensitiveFields)}
          />
          <MetricCard
            label="Consentimiento explícito"
            value={formatNumber(summary?.explicitConsent)}
          />
          <MetricCard
            label="Clases protegidas"
            value={formatNumber(summary?.protectedClasses)}
          />
        </section>
        <Card>
          <CardHeader>
            <SectionHeader
              title="Inventario de políticas"
              description="Ordenadas por tipo y código. Cada código abre su ficha."
              className="mb-0"
            />
          </CardHeader>
          <CardContent>
            {policies.isLoading ? <LoadingSkeleton rows={6} /> : null}
            {policies.data ? (
              <DataTable
                data={policies.data.items}
                columns={columns}
                meta={policies.data.meta}
                onPageChange={setPage}
                emptyTitle={
                  filtered
                    ? "No hay políticas para los filtros actuales."
                    : "Todavía no hay políticas de gobierno."
                }
                emptyDescription={
                  filtered
                    ? "Prueba a quitar algún filtro."
                    : "Se cargan con el paquete de políticas de gobierno."
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
