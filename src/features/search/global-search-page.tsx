"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useGlobalSearch } from "./hooks";
import type { GlobalSearchResult } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  MethodBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";

export function GlobalSearchPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={[]}>
      <AuthorizedGlobalSearchPage />
    </PermissionGate>
  );
}

function AuthorizedGlobalSearchPage() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const search = useGlobalSearch(q);
  const totals = useMemo(() => search.data?.totals ?? {}, [search.data]);

  return (
    <>
      <PageHeader
        eyebrow="Búsqueda"
        title="Búsqueda global"
        description="Busca en el índice oficial del servicio interno. No se agregan consultas paralelas ni cálculos client-side para alto volumen."
      />
      {!q ? (
        <EmptyState
          title="Escribe una búsqueda desde la barra superior."
          description="Puedes buscar por ruta, módulo, tabla, propósito, política, reporte o dominio."
        />
      ) : null}
      {q && search.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {q && search.error ? (
        <ErrorState
          description={
            isAtlasApiError(search.error)
              ? search.error.message
              : "No se pudo ejecutar la búsqueda."
          }
          requestId={
            isAtlasApiError(search.error) ? search.error.requestId : undefined
          }
          onRetry={() => void search.refetch()}
        />
      ) : null}
      {q && search.data ? (
        <SearchResults q={q} results={search.data.items} totals={totals} />
      ) : null}
    </>
  );
}

function SearchResults({
  q,
  results,
  totals,
}: Readonly<{
  q: string;
  results: GlobalSearchResult[];
  totals: Record<string, number>;
}>) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Resultados" value={formatNumber(results.length)} />
        {Object.entries(totals)
          .slice(0, 3)
          .map(([key, value]) => (
            <MetricCard key={key} label={key} value={formatNumber(value)} />
          ))}
      </section>
      <Card>
        <CardHeader>
          <SectionHeader
            title={`Resultados para “${q}”`}
            description="Cada resultado lleva a su pantalla dueña."
            className="mb-0"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {results.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Prueba con una ruta, tabla, módulo o dominio diferente."
            />
          ) : null}
          {results.map((result) => (
            <ResultCard key={`${result.kind}-${result.id}`} result={result} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({ result }: Readonly<{ result: GlobalSearchResult }>) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
          {result.kind}
        </p>
        <h3 className="mt-1 truncate text-sm font-semibold text-atlas-text">
          {result.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-atlas-muted">
          {safeText(result.subtitle)}
        </p>
      </div>
      <ResultMeta result={result} />
    </div>
  );

  // Sin destino seguro el resultado sigue informando, pero no navega.
  if (!result.href) {
    return (
      <div className="block rounded-lg border border-atlas-border p-4">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={result.href}
      className="block rounded-lg border border-atlas-border p-4 hover:bg-atlas-soft"
    >
      {body}
    </Link>
  );
}

function ResultMeta({ result }: Readonly<{ result: GlobalSearchResult }>) {
  return (
    <span className="inline-flex flex-wrap justify-end gap-2">
      {result.method ? <MethodBadge method={result.method} /> : null}
      {result.riskLevel ? <RiskBadge value={result.riskLevel} /> : null}
      {result.status ? <StatusBadge value={result.status} /> : null}
      {typeof result.containsPii === "boolean" ? (
        <PiiBadge value={result.containsPii} />
      ) : null}
    </span>
  );
}
