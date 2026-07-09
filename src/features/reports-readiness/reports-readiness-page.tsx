"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  useDashboard,
  useDataEntities,
  useEndpoints,
  useTestSuites,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function ReportsReadinessPage() {
  const dashboard = useDashboard();
  const endpoints = useEndpoints({ page: 1, limit: 100 });
  const entities = useDataEntities({ page: 1, limit: 100 });
  const suites = useTestSuites({ page: 1, limit: 100 });
  const error =
    dashboard.error ?? endpoints.error ?? entities.error ?? suites.error;

  const readiness = useMemo(() => {
    const tables = entities.data?.items ?? [];
    const routes = endpoints.data?.items ?? [];
    const testSuites = suites.data?.items ?? [];
    const tablesWithPurpose = tables.filter(
      (item) => item.businessPurpose && item.businessPurpose.trim().length > 0,
    ).length;
    const endpointsWithPurpose = routes.filter(
      (item) => item.businessPurpose && item.businessPurpose.trim().length > 0,
    ).length;
    const riskTables = tables.filter(
      (item) => item.containsRiskData || item.containsFinancialData,
    ).length;
    const testableEndpoints = routes.filter(
      (item) => item.isTestableFromPortal,
    ).length;
    const enabledSuites = testSuites.filter((item) => item.isEnabled).length;
    const tableCoverage = tables.length
      ? Math.round((tablesWithPurpose / tables.length) * 100)
      : 0;
    const endpointCoverage = routes.length
      ? Math.round((endpointsWithPurpose / routes.length) * 100)
      : 0;
    const qaCoverage = routes.length
      ? Math.round((testableEndpoints / routes.length) * 100)
      : 0;
    return {
      tables,
      routes,
      testSuites,
      riskTables,
      enabledSuites,
      tableCoverage,
      endpointCoverage,
      qaCoverage,
    };
  }, [endpoints.data?.items, entities.data?.items, suites.data?.items]);

  return (
    <PermissionGate permissions={["reporting.read"]}>
      <PageHeader
        eyebrow="Reporterías"
        title="Preparación para reportería dinámica"
        description="Fase 3 no crea métricas ficticias. Mide si catálogo, endpoints y QA ya tienen suficiente metadata para construir `report_definitions` y widgets reales."
      />
      {dashboard.isLoading ||
      endpoints.isLoading ||
      entities.isLoading ||
      suites.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo evaluar preparación de reportería."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void dashboard.refetch();
            void endpoints.refetch();
            void entities.refetch();
            void suites.refetch();
          }}
        />
      ) : null}
      {dashboard.data && endpoints.data && entities.data && suites.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Cobertura tablas"
              value={`${readiness.tableCoverage}%`}
            />
            <MetricCard
              label="Cobertura endpoints"
              value={`${readiness.endpointCoverage}%`}
            />
            <MetricCard
              label="QA testable"
              value={`${readiness.qaCoverage}%`}
            />
            <MetricCard
              label="Suites activas"
              value={formatNumber(readiness.enabledSuites)}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Bloques listos para reporting"
                  description="Señales mínimas antes de crear reportes ejecutivos y de riesgo."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Tablas con propósito de negocio", readiness.tableCoverage],
                  [
                    "Endpoints con propósito de negocio",
                    readiness.endpointCoverage,
                  ],
                  ["Endpoints testables desde QA", readiness.qaCoverage],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md border border-atlas-border p-3"
                  >
                    <span className="text-sm font-medium text-atlas-text">
                      {label}
                    </span>
                    <StatusBadge
                      value={
                        Number(value) >= 80
                          ? "READY"
                          : Number(value) >= 50
                            ? "NEEDS_REVIEW"
                            : "INCOMPLETE"
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Fuentes candidatas"
                  description="No son reportes finales; son fuentes candidatas por metadata financiera/riesgo."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <MetricCard
                  label="Tablas financieras/riesgo"
                  value={formatNumber(readiness.riskTables)}
                />
                <MetricCard
                  label="Endpoints disponibles"
                  value={formatNumber(readiness.routes.length)}
                />
                <MetricCard
                  label="Tablas disponibles"
                  value={formatNumber(readiness.tables.length)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Siguiente paso correcto"
                description="Evitar dashboards falsos. Primero cerrar contratos de reportería dinámica."
                className="mb-0"
              />
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-atlas-muted">
              <p>
                Para convertir esta pantalla en reportería ejecutiva real, el
                servicio interno debe exponer `report_definitions`,
                `report_widgets`, filtros, fuentes y permisos por reporte.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  className="rounded-md border border-atlas-border p-4 font-medium text-atlas-text hover:bg-atlas-soft"
                  href="/internal/data-catalog/tables"
                >
                  Revisar tablas
                </Link>
                <Link
                  className="rounded-md border border-atlas-border p-4 font-medium text-atlas-text hover:bg-atlas-soft"
                  href="/internal/systems/endpoints"
                >
                  Revisar endpoints
                </Link>
                <Link
                  className="rounded-md border border-atlas-border p-4 font-medium text-atlas-text hover:bg-atlas-soft"
                  href="/internal/qa/suites"
                >
                  Revisar QA
                </Link>
                <Link
                  className="rounded-md border border-atlas-border p-4 font-medium text-atlas-text hover:bg-atlas-soft"
                  href="/internal/review-queue"
                >
                  Resolver pendientes
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
