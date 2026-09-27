"use client";

import { Badge } from "@/shared/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useQaCampaigns, useQaTemplates } from "./run-hooks";
import { errorProps } from "./run-status";
import type { QaCampaign } from "./run-extras-types";

/** Porcentaje de cada recorrido dentro de la campaña, a partir de su peso relativo. */
export function campaignShares(
  campaign: QaCampaign,
): Array<{ code: string; version: string; percent: number }> {
  const total = campaign.templates.reduce(
    (sum, template) => sum + Math.max(template.share, 0),
    0,
  );
  return campaign.templates.map((template) => ({
    code: template.code,
    version: template.version,
    percent:
      total > 0 ? Math.round((Math.max(template.share, 0) / total) * 100) : 0,
  }));
}

/**
 * Las campañas precargadas: grupos de recorridos que se prueban juntos (regresión normal, errores
 * y fronteras…) con el reparto de personas entre ellos. Hoy el servidor las publica pero no las
 * lanza como una sola corrida, así que aquí se leen para saber qué recorridos ejecutar y en qué
 * proporción; cada recorrido se lanza desde su tarjeta.
 */
export function CampaignCatalog() {
  const campaigns = useQaCampaigns();
  const templates = useQaTemplates();
  const nameOf = (code: string) =>
    templates.data?.find((template) => template.code === code)?.name ?? code;

  if (campaigns.isLoading) return <LoadingSkeleton rows={2} />;
  if (campaigns.error)
    return (
      <ErrorState
        title="No se pudieron leer las campañas"
        {...errorProps(campaigns.error)}
        onRetry={() => void campaigns.refetch()}
      />
    );
  if (!campaigns.data || campaigns.data.length === 0)
    return (
      <EmptyState
        title="Sin campañas"
        description="El catálogo de QA no publica agrupaciones de recorridos en este entorno."
      />
    );

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {campaigns.data.map((campaign) => (
        <li
          key={campaign.code}
          className="rounded-xl border border-atlas-border bg-white p-3"
          data-testid={`qa-campaign-${campaign.code}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-atlas-text">
              {campaign.name}
            </h3>
            <Badge tone="muted">
              {campaign.templates.length} recorrido
              {campaign.templates.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-atlas-muted">
            {campaign.description}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {campaignShares(campaign).map((share) => (
              <li
                key={`${share.code}@${share.version}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate">
                  {nameOf(share.code)}{" "}
                  <span className="font-mono text-xs text-atlas-muted">
                    v{share.version}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-xs text-atlas-muted">
                  {share.percent} % de las personas
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
