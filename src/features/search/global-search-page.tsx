"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalSearch } from "./hooks";
import type { GlobalSearchKind, GlobalSearchResult } from "./types";
import type { PaginationMeta } from "@/shared/api/types";
import { Pagination } from "@/shared/components/data-table/pagination";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
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
import { Search } from "lucide-react";

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

const KINDS: readonly GlobalSearchKind[] = [
  "endpoint",
  "table",
  "quality_rule",
  "report",
];
/** Clave de `totals` (la del backend) para cada tipo. */
const TOTAL_KEY: Record<GlobalSearchKind, string> = {
  endpoint: "endpoints",
  table: "tables",
  quality_rule: "qualityRules",
  report: "reports",
};

function parseKind(value: string | null): GlobalSearchKind | null {
  return KINDS.find((kind) => kind === value) ?? null;
}

function AuthorizedGlobalSearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q")?.trim() ?? "";
  const chosenKind = parseKind(params.get("kind"));
  const kind = chosenKind ?? "endpoint";
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  // La página vuelve a 1 al cambiar de búsqueda o de pestaña.
  const pageKey = `${q}|${kind}`;
  const page = pageState.key === pageKey ? pageState.page : 1;
  const search = useGlobalSearch(q, kind, page);
  const totals = useMemo(() => search.data?.totals ?? {}, [search.data]);

  const selectKind = useCallback(
    (next: GlobalSearchKind) => {
      const query = new URLSearchParams(params.toString());
      query.set("kind", next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Sin pestaña elegida, se abre la primera que tenga resultados.
  const firstWithResults = KINDS.find(
    (each) => (totals[TOTAL_KEY[each]] ?? 0) > 0,
  );
  useEffect(() => {
    if (chosenKind || !search.data || !firstWithResults) return;
    if ((totals[TOTAL_KEY[kind]] ?? 0) === 0) selectKind(firstWithResults);
  }, [chosenKind, search.data, firstWithResults, totals, kind, selectKind]);

  return (
    <>
      <PageHeader
        icon={Search}
        eyebrow="Búsqueda"
        title="Búsqueda global"
        description="Busca en el catálogo técnico del portal: endpoints (ruta, nombre de ruta o módulo), tablas (tabla, entidad o módulo), reglas de calidad (código, nombre o tabla objetivo) y reportes. No busca clientes ni préstamos."
      />
      {!q ? (
        <EmptyState
          title="Escribe una búsqueda desde la barra superior."
          description="Busca endpoints, tablas, reglas de calidad y reportes. Un cliente se abre desde la cola de trabajo o las vistas del negocio."
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
        <SearchResults
          q={q}
          kind={kind}
          results={search.data.items.filter((item) => item.kind === kind)}
          totals={totals}
          meta={search.data.meta}
          onKindChange={selectKind}
          onPageChange={(next) => setPageState({ key: pageKey, page: next })}
        />
      ) : null}
    </>
  );
}

function SearchResults({
  q,
  kind,
  results,
  totals,
  meta,
  onKindChange,
  onPageChange,
}: Readonly<{
  q: string;
  kind: GlobalSearchKind;
  results: GlobalSearchResult[];
  totals: Record<string, number>;
  meta: PaginationMeta | null;
  onKindChange: (kind: GlobalSearchKind) => void;
  onPageChange: (page: number) => void;
}>) {
  const total = KINDS.reduce(
    (sum, each) => sum + (totals[TOTAL_KEY[each]] ?? 0),
    0,
  );
  const tabLabel = (each: GlobalSearchKind) =>
    `${TOTAL_LABELS[TOTAL_KEY[each]]} (${formatNumber(totals[TOTAL_KEY[each]] ?? 0)})`;
  const tabs = KINDS.map(tabLabel);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {/* Conteos reales del servidor por tipo, no las filas de esta página. */}
        <MetricCard label="Total" value={formatNumber(total)} />
        {KINDS.map((each) => (
          <MetricCard
            key={each}
            label={TOTAL_LABELS[TOTAL_KEY[each]]}
            value={formatNumber(totals[TOTAL_KEY[each]] ?? 0)}
          />
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
          <DetailTabs
            tabs={tabs}
            active={tabLabel(kind)}
            onChange={(label) =>
              onKindChange(KINDS[tabs.indexOf(label)] ?? kind)
            }
          />
          {results.length === 0 ? (
            <EmptyState
              title="Sin resultados de este tipo"
              description="Prueba con otra pestaña u otro texto."
            />
          ) : null}
          {results.map((result) => (
            <ResultCard key={`${result.kind}-${result.id}`} result={result} />
          ))}
          {meta && meta.total > 0 ? (
            <Pagination meta={meta} onPageChange={onPageChange} />
          ) : null}
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
          {KIND_LABELS[result.kind] ?? result.kind}
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

/** Los nombres que el backend usa para cada tipo de resultado, en palabras. */
const TOTAL_LABELS: Record<string, string> = {
  endpoints: "Endpoints",
  tables: "Tablas",
  qualityRules: "Reglas de calidad",
  reports: "Reportes",
};
const KIND_LABELS: Record<string, string> = {
  endpoint: "Endpoint",
  table: "Tabla",
  quality_rule: "Regla de calidad",
  report: "Reporte",
};
