"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type {
  NotificationChannel,
  NotificationMessage,
  NotificationStatus,
} from "./types";

const STATUS_TONE: Record<
  NotificationStatus,
  "success" | "warning" | "critical" | "muted" | "info"
> = {
  pending: "muted",
  queued: "info",
  sending: "info",
  sent: "success",
  delivered: "success",
  read: "success",
  retrying: "warning",
  failed: "critical",
  cancelled: "muted",
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: "In-app",
  push: "Push",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  phone: "Llamada",
};

export function NotificationStatusBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  const status = value as NotificationStatus | undefined;
  return (
    <Badge tone={status ? (STATUS_TONE[status] ?? "default") : "muted"} dot>
      {value ?? "—"}
    </Badge>
  );
}

export function NotificationChannelBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  const channel = value as NotificationChannel | undefined;
  return (
    <Badge tone="info">
      {channel ? (CHANNEL_LABEL[channel] ?? value) : "—"}
    </Badge>
  );
}

export function NotificationCategoryBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  if (!value) return <span className="text-atlas-muted">—</span>;
  return (
    <Badge tone={value === "system_alert" ? "critical" : "muted"}>
      {value}
    </Badge>
  );
}

export function buildNotificationMessageColumns(
  onOpen: (message: NotificationMessage) => void,
): ColumnDef<NotificationMessage>[] {
  return [
    {
      header: "Fecha",
      accessorKey: "createdAt",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: "Canal",
      accessorKey: "channel",
      cell: ({ row }) => (
        <NotificationChannelBadge value={row.original.channel} />
      ),
    },
    {
      header: "Destinatario",
      accessorKey: "recipientType",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.recipientType}#{row.original.recipientId}
        </span>
      ),
    },
    {
      header: "Plantilla",
      accessorKey: "templateCode",
      cell: ({ row }) => safeText(row.original.templateCode),
    },
    {
      header: "Categoría",
      accessorKey: "category",
      cell: ({ row }) => (
        <NotificationCategoryBadge value={row.original.category} />
      ),
    },
    {
      header: "Título / asunto",
      accessorKey: "title",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-xs">
          {safeText(row.original.title ?? row.original.subject)}
        </span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => (
        <NotificationStatusBadge value={row.original.status} />
      ),
    },
    {
      header: "Correlación",
      accessorKey: "correlationId",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-atlas-muted">
          {safeText(row.original.correlationId)}
        </span>
      ),
    },
    {
      header: "Detalle",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="text-xs font-medium text-blue-700 underline"
        >
          Ver
        </button>
      ),
    },
  ];
}
