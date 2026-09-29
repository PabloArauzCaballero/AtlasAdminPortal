"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
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
 * proporción; cada recorrido se lanza desde su fila del catálogo. Son un catálogo cerrado del
 * servidor (unas pocas) que llega entero, y se filtra aquí sobre la lista completa.
 */
export function CampaignCatalog() {
  const campaigns = useQaCampaigns();
  const templates = useQaTemplates();
  const [q, setQ] = useState("");
  const nameOf = useMemo(
    () => (code: string) =>
      templates.data?.find((template) => template.code === code)?.name ?? code,
    [templates.data],
  );
  const all = useMemo(() => campaigns.data ?? [], [campaigns.data]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((campaign) =>
      [
        campaign.name,
        campaign.code,
        campaign.description,
        ...campaign.templates.flatMap((t) => [t.code, nameOf(t.code)]),
      ].some((text) => text.toLowerCase().includes(needle)),
    );
  }, [all, q, nameOf]);
  const columns = useMemo<ColumnDef<QaCampaign>[]>(
    () => [
      {
        id: "campaign",
        header: "Campaña",
        accessorFn: (campaign) => campaign.name,
        cell: ({ row }) => (
          <div
            className="min-w-[14rem] max-w-md"
            data-testid={`qa-campaign-${row.original.code}`}
          >
            <p className="font-medium text-atlas-text">{row.original.name}</p>
            <p className="font-mono text-[0.6875rem] text-atlas-muted">
              {row.original.code}
            </p>
            <p className="mt-1 text-xs text-atlas-muted">
              {row.original.description}
            </p>
          </div>
        ),
      },
      {
        id: "count",
        header: "Recorridos",
        accessorFn: (campaign) => campaign.templates.length,
        cell: ({ row }) => (
          <Badge tone="muted">
            {row.original.templates.length} recorrido
            {row.original.templates.length === 1 ? "" : "s"}
          </Badge>
        ),
      },
      {
        id: "shares",
        header: "Reparto de personas",
        enableSorting: false,
        cell: ({ row }) => (
          <ul className="space-y-1 text-sm">
            {campaignShares(row.original).map((share) => (
              <li
                key={`${share.code}@${share.version}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="min-w-0">
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
        ),
      },
    ],
    [nameOf],
  );

  return (
    <div className="space-y-3">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar campaña o recorrido…"
        searchTooltip="Recorre el catálogo completo de campañas, que llega entero del servidor: coincide con parte del nombre, del código, de la descripción o del nombre de alguno de sus recorridos."
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      {campaigns.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {campaigns.error ? (
        <ErrorState
          title="No se pudieron leer las campañas"
          {...errorProps(campaigns.error)}
          onRetry={() => void campaigns.refetch()}
        />
      ) : null}
      {campaigns.data ? (
        <DataTable
          data={visible}
          columns={columns}
          emptyTitle={
            all.length === 0
              ? "Sin campañas"
              : "Ninguna campaña coincide con la búsqueda."
          }
          emptyDescription={
            all.length === 0
              ? "El catálogo de QA no publica agrupaciones de recorridos en este entorno."
              : "Cambia el texto de la búsqueda."
          }
        />
      ) : null}
    </div>
  );
}
