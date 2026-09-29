"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCatalogSummary } from "@/features/systems/catalog-summary-hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { Rocket } from "lucide-react";

import { ReadinessSignalsTable } from "./readiness-signals-table";

export function ReportsReadinessPage({
  embedded = false,
}: Readonly<{ embedded?: boolean }>) {
  // Embebido, el gate lo pone la página anfitriona (comportamiento previo).
  if (embedded) return <AuthorizedReportsReadinessPage embedded />;

  // Los hooks viven en el hijo a propósito: aquí saldrían durante el render,
  // antes de que el gate decidiera, y un usuario sin `reporting.read`
  // dispararía igual las cuatro queries.
  return (
    <PermissionGate permissions={["reporting.read"]}>
      <AuthorizedReportsReadinessPage />
    </PermissionGate>
  );
}

function AuthorizedReportsReadinessPage({
  embedded = false,
}: Readonly<{ embedded?: boolean }>) {
  // Las cifras salen de `GET /systems/catalog/summary`, contadas en la base sobre el catálogo
  // entero. Antes se calculaban aquí sobre las primeras 100 filas de endpoints, tablas y suites: con
  // 432 rutas y 186 tablas, «Cobertura» y «QA testable» eran porcentajes de un corte sin decirlo.
  const summary = useCatalogSummary();
  const error = summary.error;
  const readiness = useMemo(() => {
    const data = summary.data;
    const pct = (part: number, total: number) =>
      total > 0 ? Math.round((part / total) * 100) : 0;
    return {
      tableCoverage: pct(
        data?.tables.withPurpose ?? 0,
        data?.tables.total ?? 0,
      ),
      endpointCoverage: pct(
        data?.endpoints.withPurpose ?? 0,
        data?.endpoints.total ?? 0,
      ),
      qaCoverage: pct(
        data?.endpoints.testableFromPortal ?? 0,
        data?.endpoints.total ?? 0,
      ),
      enabledSuites: data?.testSuites.enabled ?? 0,
      riskTables: data?.tables.financialOrRisk ?? 0,
      routes: data?.endpoints.total ?? 0,
      tables: data?.tables.total ?? 0,
    };
  }, [summary.data]);

  const content = (
    <>
      {!embedded ? (
        <PageHeader
          icon={Rocket}
          eyebrow="Reporterías"
          title="Preparación para salir"
          description="Mide si el catálogo, las operaciones y las pruebas ya tienen suficientes metadatos para construir reportes reales, sin inventar cifras."
        />
      ) : (
        <SectionHeader
          title="Metadatos listos para reportes"
          description="Cobertura complementaria para confirmar que la versión tiene metadatos y pruebas suficientes."
        />
      )}
      {summary.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo evaluar preparación de reportería."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => void summary.refetch()}
        />
      ) : null}
      {summary.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Cobertura de tablas"
              value={`${readiness.tableCoverage}%`}
            />
            <MetricCard
              label="Cobertura de operaciones"
              value={`${readiness.endpointCoverage}%`}
            />
            <MetricCard
              label="Cobertura de pruebas"
              value={`${readiness.qaCoverage}%`}
            />
            <MetricCard
              label="Baterías de prueba activas"
              value={formatNumber(readiness.enabledSuites)}
            />
          </section>

          <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
            <section>
              <SectionHeader
                title="Sistemas listos para reportes"
                description="Señales mínimas antes de crear reportes ejecutivos y de riesgo."
              />
              <ReadinessSignalsTable
                signals={[
                  {
                    label: "Tablas con propósito de negocio",
                    coverage: readiness.tableCoverage,
                  },
                  {
                    label: "Operaciones con propósito de negocio",
                    coverage: readiness.endpointCoverage,
                  },
                  {
                    label: "Operaciones que se pueden probar",
                    coverage: readiness.qaCoverage,
                  },
                ]}
              />
            </section>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Fuentes candidatas"
                  description="No son reportes finales: son fuentes candidatas por sus metadatos financieros o de riesgo."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <MetricCard
                  label="Tablas financieras o de riesgo"
                  value={formatNumber(readiness.riskTables)}
                />
                <MetricCard
                  label="Operaciones disponibles"
                  value={formatNumber(readiness.routes)}
                />
                <MetricCard
                  label="Tablas disponibles"
                  value={formatNumber(readiness.tables)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Accesos rápidos"
                description="Completa los metadatos que faltan directamente en cada módulo."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                  Revisar operaciones
                </Link>
                <Link
                  className="rounded-md border border-atlas-border p-4 font-medium text-atlas-text hover:bg-atlas-soft"
                  href="/internal/qa/suites"
                >
                  Revisar pruebas
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
    </>
  );
  // El gate ya lo aplicó el componente de arriba: aquí solo se pinta.
  return content;
}
