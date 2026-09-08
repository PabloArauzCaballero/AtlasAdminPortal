"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDomainOverview } from "@/features/systems/hooks";
import type { DomainOverviewItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ReviewStatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { Boxes } from "lucide-react";

/**
 * Dominios del negocio.
 *
 * ## Por qué ya no se calcula aquí
 *
 * Esta vista construía el mapa en el navegador cruzando TRES listados —endpoints, tablas y suites—
 * pedidos con `limit: 100`. Con 432 endpoints y 186 tablas en el catálogo, el mapa salía de 100 de
 * cada: dominios que faltaban y cifras falsas, sin error alguno, porque 100 filas también «cargan
 * bien». Y el cruce se hacía por el primer segmento de la ruta del endpoint (`internal`, `mobile`,
 * `admin`…), que no es un dominio de negocio ni coincide con el módulo de una tabla.
 *
 * Ahora lo calcula el backend, entero, con la relación que sí existe: cada tabla lleva su dominio
 * y cada endpoint declara qué tablas toca. Aquí sólo se pinta y se filtra.
 */
export function BusinessDomainsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <AuthorizedBusinessDomainsPage />
    </PermissionGate>
  );
}

function AuthorizedBusinessDomainsPage() {
  const [q, setQ] = useState("");
  const overview = useDomainOverview();

  const domains = useMemo(() => {
    const items = overview.data?.items ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (domain) =>
        domain.domainCode.toLowerCase().includes(needle) ||
        domain.domainName.toLowerCase().includes(needle) ||
        (domain.description ?? "").toLowerCase().includes(needle) ||
        domain.modules.some((module) => module.includes(needle)),
    );
  }, [overview.data, q]);

  return (
    <>
      <PageHeader
        icon={Boxes}
        eyebrow="Metadata de negocio"
        title="Dominios del sistema"
        description="Cada dominio con sus tablas, los endpoints que las tocan y sus suites. Las cifras las calcula el backend sobre el catálogo completo."
      />
      <BusinessContextNote>
        Atlas está dividido en dominios de negocio (onboarding, riesgo,
        cobranza, cumplimiento, etc.), cada uno con sus propias tablas,
        endpoints y reglas. Esta vista existe para responder &quot;¿qué parte
        del negocio toca este endpoint o esta tabla?&quot; sin tener que
        preguntarle a quien escribió el código. Un endpoint pertenece a los
        dominios de las tablas que toca.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar dominio o módulo…"
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      {overview.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {overview.error ? (
        <ErrorState
          description={
            isAtlasApiError(overview.error)
              ? overview.error.message
              : "No se pudo cargar el mapa de dominios."
          }
          requestId={
            isAtlasApiError(overview.error)
              ? overview.error.requestId
              : undefined
          }
          onRetry={() => void overview.refetch()}
        />
      ) : null}
      {overview.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Dominios"
              value={formatNumber(overview.data.items.length)}
              hint={
                overview.data.domainSource === "fixtures"
                  ? "El catálogo en base está vacío: la lista sale de las fichas en código."
                  : undefined
              }
            />
            <MetricCard
              label="Endpoints"
              value={formatNumber(overview.data.totals.endpoints)}
              hint={`${formatNumber(overview.data.unassigned.endpoints)} sin dominio (no tocan ninguna tabla catalogada)`}
            />
            <MetricCard
              label="Tablas"
              value={formatNumber(overview.data.totals.tables)}
              hint={`${formatNumber(overview.data.unassigned.tables)} sin dominio asignado`}
              tone={overview.data.unassigned.tables > 0 ? "warning" : "default"}
            />
            <MetricCard
              label="Suites QA"
              value={formatNumber(overview.data.totals.testSuites)}
            />
          </section>

          {overview.data.unassigned.tables > 0 ? (
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Tablas sin dominio"
                  description="Lo que falta clasificar, por módulo. Mientras no tengan dominio, sus endpoints tampoco aparecen en ninguna ficha."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {overview.data.unassigned.modules.map((entry) => (
                    <li
                      key={entry.module}
                      className="rounded-md bg-atlas-soft px-2 py-1"
                    >
                      <Link
                        href={`/internal/data-catalog/tables?q=${encodeURIComponent(entry.module)}`}
                        className="font-mono text-atlas-accent underline"
                      >
                        {entry.module}
                      </Link>{" "}
                      · <strong>{formatNumber(entry.tables)}</strong>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <SectionHeader
                title="Resumen por dominio"
                description="Cada card cruza tablas, endpoints y suites para detectar cobertura y huecos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              {domains.length === 0 ? (
                <p className="text-sm text-atlas-muted">
                  Ningún dominio coincide con la búsqueda.
                </p>
              ) : null}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {domains.map((domain) => (
                  <DomainCard key={domain.domainCode} domain={domain} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function DomainCard({ domain }: Readonly<{ domain: DomainOverviewItem }>) {
  const primaryModule = domain.modules[0] ?? domain.domainCode.toLowerCase();
  return (
    <article
      data-testid={`domain-${domain.domainCode}`}
      className="rounded-lg border border-atlas-border bg-white p-4 shadow-subtle"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-atlas-text">
            {domain.domainName}
          </h3>
          <p className="font-mono text-[11px] uppercase tracking-wide text-atlas-muted">
            {domain.domainCode}
            {domain.ownerTeam ? ` · ${domain.ownerTeam}` : ""}
          </p>
        </div>
        <ReviewStatusBadge
          value={domain.pendingReview > 0 ? "NEEDS_REVIEW" : "APPROVED"}
        />
      </div>
      <p className="mt-2 text-xs italic text-atlas-muted">
        {domain.description?.trim() ||
          "Sin descripción registrada en el catálogo de dominios."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <span className="rounded-md bg-atlas-soft p-2">
          Endpoints: <strong>{formatNumber(domain.endpoints)}</strong>
        </span>
        <span className="rounded-md bg-atlas-soft p-2">
          Tablas: <strong>{formatNumber(domain.tables)}</strong>
        </span>
        <span className="rounded-md bg-atlas-soft p-2">
          Suites: <strong>{formatNumber(domain.testSuites)}</strong>
        </span>
        <span className="rounded-md bg-atlas-soft p-2">
          PII: <strong>{formatNumber(domain.piiTables)}</strong>
        </span>
        <span className="rounded-md bg-atlas-soft p-2">
          Críticos: <strong>{formatNumber(domain.criticalEndpoints)}</strong>
        </span>
        <span className="rounded-md bg-atlas-soft p-2">
          Review: <strong>{formatNumber(domain.pendingReview)}</strong>
        </span>
      </div>
      {domain.modules.length > 0 ? (
        <p className="mt-3 font-mono text-[11px] text-atlas-muted">
          {domain.modules.join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/internal/systems/endpoints?q=${encodeURIComponent(primaryModule)}`}
          className="text-xs font-medium text-atlas-accent underline"
        >
          Endpoints
        </Link>
        <Link
          href={`/internal/data-catalog/tables?q=${encodeURIComponent(primaryModule)}`}
          className="text-xs font-medium text-atlas-accent underline"
        >
          Tablas
        </Link>
        <Link
          href="/internal/review-queue"
          className="text-xs font-medium text-atlas-accent underline"
        >
          Revisión
        </Link>
      </div>
    </article>
  );
}
