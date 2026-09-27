"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { NotificationChannelBadge } from "@/features/notifications/notification-columns";
import { CAMPAIGN_STATUS, PURPOSE_LABEL } from "./campaign-options";
import type { CampaignStatus, NotificationCampaign } from "./types";

export function CampaignStatusBadge({
  value,
}: Readonly<{ value: CampaignStatus | string }>) {
  const meta = CAMPAIGN_STATUS[value as CampaignStatus];
  return (
    <Badge tone={meta?.tone ?? "muted"} dot>
      {meta?.label ?? value}
    </Badge>
  );
}

export function campaignHref(campaign: Pick<NotificationCampaign, "id">) {
  return `/internal/notifications/campaigns/${campaign.id}`;
}

/**
 * El listado no trae métricas de entrega (el servidor sólo las calcula en el detalle), así que el
 * avance aquí es el de la audiencia: a cuántas personas apunta y cuántos avisos ya generó. Lo
 * entregado, lo fallido y lo leído está en la ficha.
 */
export function buildCampaignColumns(): ColumnDef<NotificationCampaign>[] {
  return [
    {
      accessorKey: "name",
      header: "Campaña",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-atlas-text">
            {row.original.name}
          </p>
          <p className="truncate text-xs text-atlas-muted">
            {`${PURPOSE_LABEL[row.original.purpose] ?? row.original.purpose} · ${row.original.title}`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <CampaignStatusBadge value={row.original.status} />,
    },
    {
      id: "channels",
      header: "Canales",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.channels.map((channel) => (
            <NotificationChannelBadge key={channel} value={channel} />
          ))}
        </div>
      ),
    },
    {
      id: "progress",
      header: "Avance",
      cell: ({ row }) => <AudienceProgress campaign={row.original} />,
    },
    {
      accessorKey: "startsAt",
      header: "Ventana",
      cell: ({ row }) => (
        <div className="text-xs">
          <p>{formatDateTime(row.original.startsAt)}</p>
          <p className="text-atlas-muted">{`hasta ${formatDateTime(row.original.endsAt)}`}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Ficha",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Link
          href={campaignHref(row.original)}
          className="inline-flex h-8 items-center rounded-md border border-atlas-border bg-white px-2 text-xs text-atlas-text hover:bg-atlas-soft"
        >
          Ver
        </Link>
      ),
    },
  ];
}

function AudienceProgress({
  campaign,
}: Readonly<{ campaign: NotificationCampaign }>) {
  if (campaign.targetedCount === null) {
    const estimate = campaign.audienceEstimate?.total;
    return (
      <span className="text-xs text-atlas-muted">
        {estimate === undefined
          ? "Sin audiencia calculada"
          : `≈ ${formatNumber(estimate)} personas (estimado)`}
      </span>
    );
  }
  return (
    <div className="text-xs">
      <p className="text-atlas-text">{`${formatNumber(campaign.targetedCount)} personas`}</p>
      <p className="text-atlas-muted">{`${formatNumber(campaign.createdCount ?? 0)} avisos generados`}</p>
    </div>
  );
}
