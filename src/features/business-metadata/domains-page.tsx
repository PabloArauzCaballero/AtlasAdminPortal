"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDomainOverview } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
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
import { Boxes } from "lucide-react";
import {
  UrlTabPanel,
  UrlTabs,
  useUrlTab,
  type UrlTab,
} from "@/shared/components/layout/url-tabs";
import { GlossaryTermsTab } from "@/features/business-glossary/glossary-terms-tab";
import { DomainCard } from "./domain-card";

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
export const DOMAIN_TABS: readonly UrlTab[] = [
  { value: "dominios", label: "Dominios" },
  { value: "terminos", label: "Términos" },
];

/**
 * «Dominios y glosario»: los dominios con sus cifras y los términos (tablas y campos documentados).
 *
 * Eran dos entradas del menú sobre la misma fuente —el glosario se fabrica con dominios, tablas y
 * campos del catálogo—. `/internal/business-metadata/glossary` redirige aquí con `?tab=terminos`.
 * Las dos pestañas piden `businessMetadata.read`, el permiso que tenían las dos pantallas.
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
  const tab = useUrlTab("tab", DOMAIN_TABS);
  return (
    <>
      <PageHeader
        icon={Boxes}
        eyebrow="Metadata de negocio"
        title="Dominios y glosario"
        description="Cada dominio con sus tablas, las rutas que las tocan y sus suites, y el glosario de tablas y campos documentados. Las cifras las calcula el servidor sobre el catálogo completo."
      />
      <BusinessContextNote>
        Atlas está dividido en dominios de negocio (onboarding, riesgo,
        cobranza, cumplimiento, etc.), cada uno con sus propias tablas, rutas y
        reglas. Esta vista responde &quot;¿qué parte del negocio toca esta ruta
        o esta tabla?&quot; y &quot;¿qué significa este dato?&quot; sin tener
        que preguntarle a quien escribió el código.
      </BusinessContextNote>
      <UrlTabs param="tab" tabs={DOMAIN_TABS} label="Dominios y glosario" />
      <UrlTabPanel param="tab" value={tab}>
        {tab === "terminos" ? <GlossaryTermsTab /> : <DomainsTab />}
      </UrlTabPanel>
    </>
  );
}

function DomainsTab() {
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
      <FilterBar
        search={q}
        searchPlaceholder="Buscar dominio, nombre, descripción o módulo…"
        searchTooltip="Filtra los dominios ya calculados por el servidor (son pocos y llegan todos): código, nombre, descripción y módulos."
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
