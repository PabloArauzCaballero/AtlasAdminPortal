"use client";

import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatNumber } from "@/shared/lib/format";
import type { DomainNode } from "./domain-nodes";

export function DomainMapCard({ nodes }: Readonly<{ nodes: DomainNode[] }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Mapa por dominio"
          description="Agrupación dinámica por módulo/dominio reportado por el catálogo."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <div
              key={node.name}
              className="rounded-lg border border-atlas-border bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-atlas-text">
                    {node.name}
                  </h3>
                  <p className="mt-1 text-xs text-atlas-muted">
                    {formatNumber(node.endpoints)} endpoints ·{" "}
                    {formatNumber(node.dataEntities)} tablas
                  </p>
                </div>
                <StatusBadge
                  value={
                    node.riskyEndpoints + node.sensitiveTables > 0
                      ? "NEEDS_REVIEW"
                      : "OK"
                  }
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <MetricBox
                  label="Endpoints críticos"
                  value={node.riskyEndpoints}
                />
                <MetricBox
                  label="Tablas sensibles"
                  value={node.sensitiveTables}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
