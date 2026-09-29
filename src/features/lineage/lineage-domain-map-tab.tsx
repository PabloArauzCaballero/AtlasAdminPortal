"use client";

import Link from "next/link";
import { useDomainOverview } from "@/features/systems/hooks";
import { DomainsTable } from "@/features/business-metadata/domains-table";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";

/**
 * El mapa por dominio, con las cifras que calcula el servidor sobre el catálogo entero
 * (`/systems/domains/overview`). Antes se agregaba en el navegador sobre 100 rutas y 100 tablas:
 * dominios que faltaban y contadores por debajo del real, sin ningún aviso.
 */
export function LineageDomainMapTab() {
  const overview = useDomainOverview();
  if (overview.isLoading) return <LoadingSkeleton rows={6} />;
  if (overview.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(overview.error)
            ? overview.error.message
            : "No se pudo cargar el mapa por dominio."
        }
        requestId={
          isAtlasApiError(overview.error) ? overview.error.requestId : undefined
        }
        onRetry={() => void overview.refetch()}
      />
    );
  }
  if (!overview.data) return null;
  const { items, totals, unassigned } = overview.data;
  return (
    <div className="space-y-6">
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dominios" value={formatNumber(items.length)} />
        <MetricCard
          label="Rutas"
          value={formatNumber(totals.endpoints)}
          hint={`${formatNumber(unassigned.endpoints)} sin dominio (no tocan ninguna tabla catalogada)`}
        />
        <MetricCard
          label="Tablas"
          value={formatNumber(totals.tables)}
          hint={`${formatNumber(unassigned.tables)} sin dominio asignado`}
        />
        <MetricCard
          label="Tablas con datos personales"
          value={formatNumber(
            items.reduce((sum, item) => sum + item.piiTables, 0),
          )}
        />
      </section>
      <p className="text-xs text-atlas-muted">
        Una ruta pertenece a los dominios de las tablas que toca. La ficha
        completa de cada dominio está en{" "}
        <Link
          className="font-medium text-atlas-accent underline"
          href="/internal/business-metadata/domains"
        >
          Dominios y glosario
        </Link>
        .
      </p>
      <DomainsTable domains={items} />
    </div>
  );
}
