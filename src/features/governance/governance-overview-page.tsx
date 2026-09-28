"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWholeCatalog } from "./hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { Scale } from "lucide-react";

export function GovernanceOverviewPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["governance.data.read"]}>
      <AuthorizedGovernanceOverviewPage />
    </PermissionGate>
  );
}

function AuthorizedGovernanceOverviewPage() {
  const catalog = useWholeCatalog();
  const error = catalog.error;

  const stats = useMemo(() => {
    const tables = catalog.data?.entities.items ?? [];
    const routes = catalog.data?.endpoints.items ?? [];
    return {
      piiTables: tables.filter((item) => item.containsPii).length,
      financialTables: tables.filter((item) => item.containsFinancialData)
        .length,
      riskTables: tables.filter((item) => item.containsRiskData).length,
      legalTables: tables.filter((item) => item.containsLegalData).length,
      deviceTables: tables.filter(
        (item) => item.containsDeviceData || item.containsLocationData,
      ).length,
      auditCriticalTables: tables.filter((item) => item.isAuditCritical).length,
      piiEndpoints: routes.filter((item) => item.containsPii).length,
      destructiveEndpoints: routes.filter((item) => item.isDestructive).length,
      criticalEndpoints: routes.filter(
        (item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL",
      ).length,
      pendingReview:
        tables.filter(
          (item) =>
            item.reviewStatus === "NEEDS_REVIEW" ||
            item.reviewStatus === "AUTO_DETECTED",
        ).length +
        routes.filter(
          (item) =>
            item.reviewStatus === "NEEDS_REVIEW" ||
            item.reviewStatus === "AUTO_DETECTED",
        ).length,
    };
  }, [catalog.data]);

  return (
    <>
      <PageHeader
        icon={Scale}
        eyebrow="Gobierno de datos"
        title="Gobierno de datos"
        description="Cuántas tablas y rutas manejan datos personales, financieros o de riesgo, y cuántas siguen sin revisar. Sale del catálogo real, entero."
      />
      <BusinessContextNote>
        Manejar datos de clientes (identidad, finanzas, ubicación) conlleva
        obligaciones legales y de seguridad. Esta pantalla existe para que
        gobierno de datos vea, sin auditar el código, cuánta información
        sensible maneja Atlas y qué tan revisada/documentada está esa
        exposición.
      </BusinessContextNote>
      {catalog.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar gobierno de datos."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => void catalog.refetch()}
        />
      ) : null}
      {catalog.data ? (
        <div className="space-y-6">
          <p className="text-sm text-atlas-muted">
            Contado sobre {formatNumber(catalog.data.entities.total)} tablas y{" "}
            {formatNumber(catalog.data.endpoints.total)} rutas del catálogo.
            {catalog.data.entities.truncated || catalog.data.endpoints.truncated
              ? " El catálogo es más grande de lo que esta pantalla lee de una vez: los números son un mínimo."
              : ""}
          </p>
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tablas con PII"
              value={formatNumber(stats.piiTables)}
            />
            <MetricCard
              label="Tablas financieras"
              value={formatNumber(stats.financialTables)}
            />
            <MetricCard
              label="Tablas de riesgo"
              value={formatNumber(stats.riskTables)}
            />
            <MetricCard
              label="Pendientes de revisión"
              value={formatNumber(stats.pendingReview)}
            />
          </section>

          <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Clasificación de tablas"
                  description="Cuántas tablas del catálogo llevan cada marca."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Legal", stats.legalTables],
                  ["Dispositivo / ubicación", stats.deviceTables],
                  ["Auditoría crítica", stats.auditCriticalTables],
                  ["Financiera", stats.financialTables],
                  ["Riesgo", stats.riskTables],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md border border-atlas-border p-3"
                  >
                    <span className="text-sm font-medium text-atlas-text">
                      {label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-atlas-text">
                      {formatNumber(Number(value))}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Riesgo operativo por ruta"
                  description="Rutas que tocan datos personales, que borran o que tienen riesgo alto o crítico."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <MetricCard
                  label="PII"
                  value={formatNumber(stats.piiEndpoints)}
                />
                <MetricCard
                  label="Destructivos"
                  value={formatNumber(stats.destructiveEndpoints)}
                />
                <MetricCard
                  label="Alto/crítico"
                  value={formatNumber(stats.criticalEndpoints)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Registros de gobierno disponibles"
                description="Accesos a vistas controladas por permisos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
                href="/internal/governance/pii"
              >
                Registro de datos personales
              </Link>
              <Link
                className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
                href="/internal/data-catalog/tables"
              >
                Catálogo de tablas
              </Link>
              <Link
                className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
                href="/internal/review-queue"
              >
                Cola de revisión
              </Link>
              <Link
                className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
                href="/internal/audit"
              >
                Auditoría
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
