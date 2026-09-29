"use client";

import { ExportDownloadButton } from "@/features/data-exports/export-download-button";

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
import {
  RULE_STATUS_OPTIONS,
  SEVERITY_OPTIONS,
} from "@/features/data-quality-issues/quality-options";
import { buildRuleColumns } from "./rule-columns";
import { useDataQualityRules } from "./hooks";
import { ShieldCheck } from "lucide-react";

export function DataQualityRulesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["dataQuality.rules.read"]}>
      <AuthorizedDataQualityRulesPage />
    </PermissionGate>
  );
}

/**
 * Las opciones de los filtros son fijas (antes salían de la página cargada y se autorrestringían) y
 * los dos filtros viajan a AtlasBackend, que antes los descartaba. Las tarjetas salen de `summary`,
 * que cuenta TODAS las reglas del filtro; antes «Críticas» sumaba la página y comparaba contra
 * `CRITICAL` datos guardados en minúscula, así que decía siempre 0.
 */
function AuthorizedDataQualityRulesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const rules = useDataQualityRules({ page, limit: 20, q, severity, status });
  const items = useMemo(() => rules.data?.items ?? [], [rules.data]);
  const columns = useMemo(() => buildRuleColumns(), []);
  const summary = rules.data?.summary;
  const filtered = Boolean(q || severity || status);

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Reglas de calidad"
        title="Reglas de calidad"
        description="Catálogo de reglas de calidad: qué comprueban, su severidad, si están activas y cuántas incidencias tienen pendientes."
        actions={
          <ExportDownloadButton
            downloadUrl="/api/v1/internal/data-quality/rules"
            fileName="reglas-de-calidad"
          />
        }
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre, tabla o campo…"
        searchTooltip="Busca el texto dentro del código, el nombre, la tabla o el campo de la regla."
        filters={[
          {
            name: "severity",
            label: "Severidad",
            tooltip: "Qué tan grave es un dato que no cumple la regla.",
            value: severity,
            options: SEVERITY_OPTIONS,
          },
          {
            name: "status",
            label: "Estado",
            tooltip:
              "Si la regla está encendida o apagada en el catálogo; no es una ejecución.",
            value: status,
            options: RULE_STATUS_OPTIONS,
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
      {rules.error ? (
        <ErrorState
          description={
            isAtlasApiError(rules.error)
              ? rules.error.message
              : "No se pudieron cargar reglas de calidad."
          }
          requestId={
            isAtlasApiError(rules.error) ? rules.error.requestId : undefined
          }
          onRetry={() => void rules.refetch()}
        />
      ) : null}
      <div className="space-y-6">
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Reglas"
            value={formatNumber(summary?.total ?? rules.data?.meta.total)}
          />
          <MetricCard label="Activas" value={formatNumber(summary?.active)} />
          <MetricCard
            label="Críticas"
            value={formatNumber(summary?.critical)}
          />
          <MetricCard
            label="Incidencias pendientes"
            value={formatNumber(summary?.pendingIssues)}
          />
        </section>
        <Card>
          <CardHeader>
            <SectionHeader
              title="Inventario de reglas"
              description="Ordenadas de más a menos grave. «Pendientes» cuenta las incidencias sin revisar o reconocidas sin corregir."
              className="mb-0"
            />
          </CardHeader>
          <CardContent>
            {rules.isLoading ? <LoadingSkeleton rows={6} /> : null}
            {rules.data ? (
              <DataTable
                data={items}
                columns={columns}
                meta={rules.data.meta}
                onPageChange={setPage}
                emptyTitle={
                  filtered
                    ? "No hay reglas de calidad para los filtros actuales."
                    : "Todavía no hay reglas de calidad."
                }
                emptyDescription={
                  filtered
                    ? "Prueba a quitar algún filtro."
                    : "Las reglas se publican con el paquete de políticas de gobierno."
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
