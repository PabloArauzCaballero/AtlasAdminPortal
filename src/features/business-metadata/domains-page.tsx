"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useDataEntities,
  useEndpoints,
  useTestSuites,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
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

type DomainSummary = {
  name: string;
  endpoints: number;
  tables: number;
  testSuites: number;
  piiTables: number;
  pendingReview: number;
  criticalEndpoints: number;
};

export function BusinessDomainsPage() {
  const [q, setQ] = useState("");
  const endpoints = useEndpoints({ page: 1, limit: 100, q });
  const entities = useDataEntities({ page: 1, limit: 100, q });
  const suites = useTestSuites({ page: 1, limit: 100 });
  const error = endpoints.error ?? entities.error ?? suites.error;

  const domains = useMemo(() => {
    const map = new Map<string, DomainSummary>();
    const ensure = (name?: string | null) => {
      const key = name?.trim() || "Sin dominio";
      const current = map.get(key) ?? {
        name: key,
        endpoints: 0,
        tables: 0,
        testSuites: 0,
        piiTables: 0,
        pendingReview: 0,
        criticalEndpoints: 0,
      };
      map.set(key, current);
      return current;
    };

    (endpoints.data?.items ?? []).forEach((endpoint) => {
      const domain = ensure(endpoint.module);
      domain.endpoints += 1;
      if (
        endpoint.reviewStatus === "NEEDS_REVIEW" ||
        endpoint.reviewStatus === "AUTO_DETECTED"
      )
        domain.pendingReview += 1;
      if (endpoint.riskLevel === "HIGH" || endpoint.riskLevel === "CRITICAL")
        domain.criticalEndpoints += 1;
    });

    (entities.data?.items ?? []).forEach((entity) => {
      const domain = ensure(entity.module);
      domain.tables += 1;
      if (entity.containsPii) domain.piiTables += 1;
      if (
        entity.reviewStatus === "NEEDS_REVIEW" ||
        entity.reviewStatus === "AUTO_DETECTED"
      )
        domain.pendingReview += 1;
    });

    (suites.data?.items ?? []).forEach((suite) => {
      ensure(suite.module).testSuites += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.endpoints +
        b.tables +
        b.testSuites -
        (a.endpoints + a.tables + a.testSuites),
    );
  }, [endpoints.data?.items, entities.data?.items, suites.data?.items]);

  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <PageHeader
        eyebrow="Metadata de negocio"
        title="Dominios del sistema"
        description="Mapa derivado desde módulos reportados por endpoints, tablas y suites QA. No se fija una lista cerrada en la interfaz."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar dominio, tabla o endpoint…"
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      {endpoints.isLoading || entities.isLoading || suites.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar dominios."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void endpoints.refetch();
            void entities.refetch();
            void suites.refetch();
          }}
        />
      ) : null}
      {endpoints.data && entities.data && suites.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Dominios" value={formatNumber(domains.length)} />
            <MetricCard
              label="Endpoints"
              value={formatNumber(endpoints.data.items.length)}
            />
            <MetricCard
              label="Tablas"
              value={formatNumber(entities.data.items.length)}
            />
            <MetricCard
              label="Suites QA"
              value={formatNumber(suites.data.items.length)}
            />
          </section>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Resumen por dominio"
                description="Cada card cruza endpoints, tablas y suites para detectar cobertura y huecos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {domains.map((domain) => (
                  <article
                    key={domain.name}
                    className="rounded-lg border border-atlas-border bg-white p-4 shadow-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-atlas-text">
                        {domain.name}
                      </h3>
                      <StatusBadge
                        value={domain.pendingReview > 0 ? "NEEDS_REVIEW" : "OK"}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded-md bg-atlas-soft p-2">
                        Endpoints:{" "}
                        <strong>{formatNumber(domain.endpoints)}</strong>
                      </span>
                      <span className="rounded-md bg-atlas-soft p-2">
                        Tablas: <strong>{formatNumber(domain.tables)}</strong>
                      </span>
                      <span className="rounded-md bg-atlas-soft p-2">
                        Suites:{" "}
                        <strong>{formatNumber(domain.testSuites)}</strong>
                      </span>
                      <span className="rounded-md bg-atlas-soft p-2">
                        PII: <strong>{formatNumber(domain.piiTables)}</strong>
                      </span>
                      <span className="rounded-md bg-atlas-soft p-2">
                        Críticos:{" "}
                        <strong>
                          {formatNumber(domain.criticalEndpoints)}
                        </strong>
                      </span>
                      <span className="rounded-md bg-atlas-soft p-2">
                        Review:{" "}
                        <strong>{formatNumber(domain.pendingReview)}</strong>
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/internal/systems/endpoints?q=${encodeURIComponent(domain.name)}`}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Endpoints
                      </Link>
                      <Link
                        href={`/internal/data-catalog/tables?q=${encodeURIComponent(domain.name)}`}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Tablas
                      </Link>
                      <Link
                        href="/internal/review-queue"
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Revisión
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
