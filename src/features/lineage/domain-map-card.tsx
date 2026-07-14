"use client";

import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge, ReviewStatusBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { formatNumber } from "@/shared/lib/format";
import type { Domain } from "@/features/systems/types";
import { normalizeModule } from "@/features/systems/domain-module-map";
import type { DomainNode } from "./domain-nodes";

export function DomainMapCard({
  nodes,
  domainsByCode,
}: Readonly<{ nodes: DomainNode[]; domainsByCode: Map<string, Domain> }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Mapa por dominio"
          description="Agrupación dinámica por módulo reportado por el catálogo, enriquecida con la descripción oficial del dominio de negocio cuando existe una coincidencia."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <DomainNodeCard
              key={node.name}
              node={node}
              domain={domainsByCode.get(normalizeModule(node.name))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DomainNodeCard({
  node,
  domain,
}: Readonly<{ node: DomainNode; domain?: Domain }>) {
  return (
    <div className="rounded-lg border border-atlas-border bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-atlas-text">
            {domain?.domainName ?? node.name}
          </h3>
          <p className="mt-1 text-xs text-atlas-muted">
            {formatNumber(node.endpoints)} endpoints ·{" "}
            {formatNumber(node.dataEntities)} tablas
          </p>
        </div>
        <ReviewStatusBadge
          value={node.pendingReviews > 0 ? "NEEDS_REVIEW" : "APPROVED"}
        />
      </div>
      {domain ? (
        <p className="mt-2 text-xs leading-5 text-atlas-muted">
          {domain.description}{" "}
          <span className="font-medium text-atlas-text">
            Owner: {domain.ownerTeam}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-xs italic text-atlas-muted">
          Módulo &quot;{node.name}&quot; sin dominio de negocio asociado todavía
          en el catálogo.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <MetricBox label="Endpoints críticos" value={node.riskyEndpoints} />
        <MetricBox label="Tablas sensibles" value={node.sensitiveTables} />
        <MetricBox label="Pendientes de revisión" value={node.pendingReviews} />
      </div>
      {domain?.exampleTables?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {domain.exampleTables.slice(0, 4).map((table) => (
            <Badge key={table} tone="muted">
              {table}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricBox({
  label,
  value,
}: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-md border border-atlas-border bg-white p-2">
      <span className="block text-atlas-muted">{label}</span>
      <strong className="text-atlas-text">{formatNumber(value)}</strong>
    </div>
  );
}
