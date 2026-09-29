"use client";

import { useMemo, useState } from "react";
import { Table2 } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { serverPagedColumns } from "@/shared/components/data-table/server-columns";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { buildGovernedColumns } from "./governed-columns";
import { useGovernedView, useGovernedViewFacets } from "./hooks";
import { GOVERNED_VIEWS, type GovernedViewKey } from "./types";

/**
 * Vistas gobernadas del negocio.
 *
 * Siete consultas de sólo lectura sobre `read_api.v_*` que el backend expone en `/internal/views` y
 * que ninguna pantalla llamaba: el propio controlador dice que compone «una vista gobernada para el
 * portal administrativo», y el portal no la pedía. Mirar un cliente, una decisión de riesgo o la
 * cola operativa exigía SQL contra la base, que es exactamente lo que estas vistas existen para
 * evitar.
 *
 * Una sola pantalla para las siete, y no siete pantallas, porque comparten contrato entero:
 * paginación, proyección de campos y filtros declarados. Duplicarla siete veces sería duplicar
 * también el día que cambie la forma.
 */
export function GovernedViewsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedGovernedViewsPage />
    </RoleGate>
  );
}

function AuthorizedGovernedViewsPage() {
  const [viewKey, setViewKey] = useState<GovernedViewKey>("customers");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [facets, setFacets] = useState<Record<string, string>>({});

  const definition = GOVERNED_VIEWS.find((item) => item.key === viewKey)!;

  /*
   * Los esquemas del backend son `.strict()`: un filtro que esa vista no declara devuelve 400. Por
   * eso sólo se envían los de la vista activa y no el estado acumulado de las anteriores.
   */
  const query = useMemo(() => {
    const activos: Record<string, string | number> = { page, limit: 20 };
    if (q) activos.q = q;
    for (const filtro of definition.filters) {
      if (facets[filtro.name]) {
        activos[filtro.name] = facets[filtro.name] as string;
      }
    }
    return activos;
  }, [page, q, facets, definition]);

  const vista = useGovernedView(viewKey, query);
  const valores = useGovernedViewFacets(viewKey);
  const items = useMemo(() => vista.data?.items ?? [], [vista.data]);
  const campos = useMemo(
    () => vista.data?.meta.selectedFields ?? Object.keys(items[0] ?? {}),
    [vista.data, items],
  );
  const columns = useMemo(
    () => serverPagedColumns(buildGovernedColumns(campos)),
    [campos],
  );

  function cambiarVista(key: GovernedViewKey) {
    setViewKey(key);
    setPage(1);
    setQ("");
    setFacets({});
  }

  return (
    <>
      <PageHeader
        icon={Table2}
        eyebrow="Lectura gobernada"
        title="Vistas del negocio"
        description="Consultas de sólo lectura sobre las vistas publicadas: clientes, riesgo, cola operativa, proveedores, notificaciones, endpoints y auditoría. Sin acceso a las tablas de origen."
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Vistas gobernadas">
        {GOVERNED_VIEWS.map((item) => (
          <Button
            key={item.key}
            variant={item.key === viewKey ? "primary" : "secondary"}
            onClick={() => cambiarVista(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      <p className="mb-4 text-sm text-atlas-muted">{definition.description}</p>

      <FilterBar
        search={q}
        searchPlaceholder={`Buscar por ${definition.search}…`}
        searchTooltip={`Busca en el servidor, en toda la vista, por ${definition.search}.`}
        filters={definition.filters.map((filtro) => ({
          name: filtro.name,
          label: filtro.label,
          value: facets[filtro.name] ?? "",
          /* Los valores los publica el servidor sobre la vista entera: antes salían de la página
           * cargada y, al elegir uno, las demás opciones desaparecían. */
          options: uniqueTextOptions(valores.data?.facets[filtro.name] ?? []),
          tooltip: `Sólo registros con este valor de «${filtro.label}».`,
        }))}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          setFacets((actual) => ({ ...actual, [name]: value }));
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setFacets({});
          setPage(1);
        }}
      />

      {vista.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {vista.error ? (
        <ErrorState
          description={
            isAtlasApiError(vista.error)
              ? vista.error.message
              : "No se pudo cargar la vista gobernada."
          }
          requestId={
            isAtlasApiError(vista.error) ? vista.error.requestId : undefined
          }
          onRetry={() => void vista.refetch()}
        />
      ) : null}
      {vista.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <MetricCard
              label="Registros"
              value={formatNumber(vista.data.meta.total)}
            />
            <MetricCard label="Columnas" value={formatNumber(campos.length)} />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={vista.data.meta}
            onPageChange={setPage}
            emptyTitle="La vista no devuelve registros con estos filtros."
            emptyDescription="Prueba a limpiar los filtros: son los que declara el backend para esta vista."
          />
        </div>
      ) : null}
    </>
  );
}
