"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDataEntities, useEndpoints } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function GovernanceOverviewPage() {
  const entities = useDataEntities({ page: 1, limit: 100 });
  const endpoints = useEndpoints({ page: 1, limit: 100 });
  const error = entities.error ?? endpoints.error;

  const stats = useMemo(() => {
    const tables = entities.data?.items ?? [];
    const routes = endpoints.data?.items ?? [];
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
  }, [endpoints.data?.items, entities.data?.items]);

  return (
    <PermissionGate permissions={["governance.data.read"]}>
      <PageHeader
        eyebrow="Gobierno de datos"
        title="Gobierno de datos"
        description="Resumen dinámico de sensibilidad, PII, criticidad y revisión. Esta fase no inventa políticas; expone lo disponible en catálogo real."
      />
      <BusinessContextNote>
        Manejar datos de clientes (identidad, finanzas, ubicación) conlleva
        obligaciones legales y de seguridad. Esta pantalla existe para que
        gobierno de datos vea, sin auditar el código, cuánta información
        sensible maneja Atlas y qué tan revisada/documentada está esa
        exposición.
      </BusinessContextNote>
      {entities.isLoading || endpoints.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar gobierno de datos."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void entities.refetch();
            void endpoints.refetch();
          }}
        />
      ) : null}
      {entities.data && endpoints.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Clasificación de tablas"
                  description="Controles derivados de flags de catálogo."
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
                    <StatusBadge
                      value={Number(value) > 0 ? "ACTIVE" : "EMPTY"}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Riesgo operativo por endpoint"
                  description="Endpoints con PII, destructivos o riesgo alto/crítico."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
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
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
                href="/internal/governance/pii"
              >
                PII registry
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
    </PermissionGate>
  );
}
