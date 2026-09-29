"use client";

import Link from "next/link";
import { useCatalogSummary } from "@/features/systems/catalog-summary-hooks";
import {
  UrlTabPanel,
  UrlTabs,
  useUrlTab,
  type UrlTab,
} from "@/shared/components/layout/url-tabs";
import { PiiRegistryTab } from "./pii-registry-page";
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

export const GOVERNANCE_TABS: readonly UrlTab[] = [
  { value: "resumen", label: "Resumen" },
  { value: "datos-personales", label: "Datos personales" },
];

function AuthorizedGovernanceOverviewPage() {
  const tab = useUrlTab("tab", GOVERNANCE_TABS);
  return (
    <>
      <PageHeader
        icon={Scale}
        eyebrow="Gobierno de datos"
        title="Gobierno de datos"
        description="Cuántas tablas y rutas manejan datos personales, financieros o de riesgo, cuántas siguen sin revisar y cuáles son. Contado en el servidor sobre el catálogo completo."
      />
      <BusinessContextNote>
        Manejar datos de clientes (identidad, finanzas, ubicación) conlleva
        obligaciones legales y de seguridad. Esta pantalla existe para que
        gobierno de datos vea, sin auditar el código, cuánta información
        sensible maneja Atlas y qué tan revisada/documentada está esa
        exposición.
      </BusinessContextNote>
      {/* Las dos pestañas piden `governance.data.read`, el permiso que tenían las dos pantallas. */}
      <UrlTabs param="tab" tabs={GOVERNANCE_TABS} label="Gobierno de datos" />
      <UrlTabPanel param="tab" value={tab}>
        {tab === "datos-personales" ? (
          <PiiRegistryTab />
        ) : (
          <GovernanceSummaryTab />
        )}
      </UrlTabPanel>
    </>
  );
}

/**
 * Las cifras salen de `GET /systems/catalog/summary`, contadas en la base. Antes esta pestaña bajaba
 * el catálogo entero de tablas y rutas al navegador para contarlo.
 */
function GovernanceSummaryTab() {
  const catalog = useCatalogSummary();
  const stats = catalog.data;
  if (catalog.isLoading) return <LoadingSkeleton rows={6} />;
  if (catalog.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(catalog.error)
            ? catalog.error.message
            : "No se pudo cargar gobierno de datos."
        }
        requestId={
          isAtlasApiError(catalog.error) ? catalog.error.requestId : undefined
        }
        onRetry={() => void catalog.refetch()}
      />
    );
  }
  if (!stats) return null;
  const { tables, endpoints } = stats;
  return (
    <div className="space-y-6">
      <p className="text-sm text-atlas-muted">
        Contado sobre {formatNumber(tables.total)} tablas y{" "}
        {formatNumber(endpoints.total)} rutas del catálogo.
      </p>
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tablas con PII" value={formatNumber(tables.pii)} />
        <MetricCard
          label="Tablas financieras"
          value={formatNumber(tables.financial)}
        />
        <MetricCard
          label="Tablas de riesgo"
          value={formatNumber(tables.risk)}
        />
        <MetricCard
          label="Pendientes de revisión"
          value={formatNumber(tables.pendingReview + endpoints.pendingReview)}
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
              ["Legal", tables.legal],
              ["Dispositivo / ubicación", tables.deviceOrLocation],
              ["Auditoría crítica", tables.auditCritical],
              ["Financiera", tables.financial],
              ["Riesgo", tables.risk],
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
            <MetricCard label="PII" value={formatNumber(endpoints.pii)} />
            <MetricCard
              label="Destructivos"
              value={formatNumber(endpoints.destructive)}
            />
            <MetricCard
              label="Alto/crítico"
              value={formatNumber(endpoints.highOrCritical)}
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
            href="/internal/governance?tab=datos-personales"
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
  );
}
