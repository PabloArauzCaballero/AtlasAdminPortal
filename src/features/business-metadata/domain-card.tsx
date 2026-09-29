"use client";

import Link from "next/link";
import type { DomainOverviewItem } from "@/features/systems/types";
import { ReviewStatusBadge } from "@/shared/components/ui/badges";
import { formatNumber } from "@/shared/lib/format";

/** Ficha de un dominio con sus cifras del servidor. La usan «Dominios y glosario» y el mapa del linaje. */
export function DomainCard({
  domain,
}: Readonly<{ domain: DomainOverviewItem }>) {
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
