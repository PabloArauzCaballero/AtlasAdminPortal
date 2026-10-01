"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  NotificationChannelBadge,
  NotificationStatusBadge,
} from "@/features/notifications/notification-columns";
import { MESSAGE_STATUS_OPTIONS } from "@/features/notifications/notification-options";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { CAMPAIGN_CHANNEL_OPTIONS } from "./campaign-options";
import { useCampaignMessages } from "./hooks";
import type { CampaignMessage } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

/** Un aviso por persona y canal, con su estado de entrega. */
export function CampaignMessagesSection({
  campaignId,
}: Readonly<{ campaignId: string }>) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const messages = useCampaignMessages(campaignId, {
    page,
    limit: usePageSize(20),
    status,
    channel,
    recipientId,
  });
  const columns = useMemo(() => buildMessageColumns(), []);

  return (
    <div className="space-y-4">
      <FilterBar
        search={recipientId}
        searchPlaceholder="Buscar por cliente…"
        searchTooltip="El número de cliente exacto, para ver qué le llegó a esa persona."
        onSearchChange={(value) => {
          setRecipientId(value.trim());
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "En qué punto de la entrega está cada aviso; «failed» es lo que hay que mirar.",
            value: status,
            options: MESSAGE_STATUS_OPTIONS,
          },
          {
            name: "channel",
            label: "Canal",
            tooltip:
              "Por qué vía salió el aviso: app, notificación al teléfono o correo.",
            value: channel,
            options: CAMPAIGN_CHANNEL_OPTIONS,
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "channel") setChannel(value);
          setPage(1);
        }}
        onClear={() => {
          setStatus("");
          setChannel("");
          setRecipientId("");
          setPage(1);
        }}
      />
      {messages.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {messages.error ? (
        <ErrorState
          description={
            isAtlasApiError(messages.error)
              ? messages.error.message
              : "No se pudieron cargar los avisos de la campaña."
          }
          requestId={
            isAtlasApiError(messages.error)
              ? messages.error.requestId
              : undefined
          }
          onRetry={() => void messages.refetch()}
        />
      ) : null}
      {messages.data ? (
        <DataTable
          data={messages.data.items}
          columns={columns}
          meta={messages.data.meta}
          onPageChange={setPage}
          emptyTitle="Sin avisos para estos filtros."
          emptyDescription="Los avisos aparecen cuando la campaña empieza a enviar a su audiencia."
        />
      ) : null}
    </div>
  );
}

function buildMessageColumns(): ColumnDef<CampaignMessage>[] {
  return [
    {
      accessorKey: "recipientId",
      header: "Cliente",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.recipientId}</span>
      ),
    },
    {
      accessorKey: "channel",
      header: "Canal",
      cell: ({ row }) => (
        <NotificationChannelBadge value={row.original.channel} />
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <NotificationStatusBadge value={row.original.status} />
      ),
    },
    {
      accessorKey: "scheduledAt",
      header: "Turno",
      cell: ({ row }) => formatDateTime(row.original.scheduledAt),
    },
    {
      id: "outcome",
      header: "Resultado",
      cell: ({ row }) => <MessageOutcome message={row.original} />,
    },
  ];
}

function MessageOutcome({ message }: Readonly<{ message: CampaignMessage }>) {
  const steps: [string, string | null][] = [
    ["Enviado", message.sentAt],
    ["Entregado", message.deliveredAt],
    ["Leído", message.readAt],
    ["Falló", message.failedAt],
    ["Anulado", message.cancelledAt],
  ];
  const done = steps.filter(([, at]) => Boolean(at));
  if (done.length === 0)
    return <span className="text-xs text-atlas-muted">—</span>;
  return (
    <ul className="text-xs">
      {done.map(([label, at]) => (
        <li key={label}>{`${label} ${formatDateTime(at)}`}</li>
      ))}
    </ul>
  );
}
