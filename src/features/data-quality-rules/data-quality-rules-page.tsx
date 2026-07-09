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
import { uniqueTextOptions } from "@/shared/lib/options";
import { buildRuleColumns } from "./rule-columns";
import { useDataQualityRules } from "./hooks";

export function DataQualityRulesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const rules = useDataQualityRules({ page, limit: 20, q, severity, status });
  const items = useMemo(() => rules.data?.items ?? [], [rules.data]);
  const columns = useMemo(() => buildRuleColumns(), []);
  const severityOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.severity)),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );

  return (
    <PermissionGate permissions={["dataQuality.rules.read"]}>
      <PageHeader
        eyebrow="Fase 7"
        title="Reglas de calidad"
        description="Catálogo real de reglas de calidad, severidad, dueño, estado y última ejecución."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar regla, código, tabla o dueño…"
        filters={[
          {
            name: "severity",
            label: "Severidad",
            value: severity,
            options: severityOptions,
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
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
      {rules.isLoading ? <LoadingSkeleton rows={6} /> : null}
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
      {rules.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Reglas"
              value={formatNumber(rules.data.meta.total)}
            />
            <MetricCard label="Visibles" value={formatNumber(items.length)} />
            <MetricCard
              label="Críticas"
              value={formatNumber(
                items.filter((i) => i.severity === "CRITICAL").length,
              )}
            />
            <MetricCard
              label="Issues abiertos"
              value={formatNumber(
                items.reduce((sum, item) => sum + item.openIssues, 0),
              )}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Inventario de reglas"
                description="Las reglas vienen desde BD; la interfaz no define tipos ni targets fijos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={rules.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay reglas de calidad para los filtros actuales."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
