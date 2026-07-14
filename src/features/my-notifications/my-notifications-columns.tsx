"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  NotificationCategoryBadge,
  NotificationChannelBadge,
} from "@/features/notifications/notification-columns";
import type { NotificationMessage } from "@/features/notifications/types";
import { formatDateTime, safeText } from "@/shared/lib/format";

export function buildMyNotificationColumns(
  onMarkRead: (notificationId: string) => void,
  isMarkingRead: boolean,
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
      header: "Categoría",
      accessorKey: "category",
      cell: ({ row }) => (
        <NotificationCategoryBadge value={row.original.category} />
      ),
    },
    {
      header: "Notificación",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="text-sm font-medium text-atlas-text">
            {safeText(row.original.title)}
          </p>
          <p className="line-clamp-2 text-xs text-atlas-muted">
            {row.original.body}
          </p>
        </div>
      ),
    },
    {
      header: "Estado",
      cell: ({ row }) =>
        row.original.readAt ? (
          <span className="text-xs text-atlas-muted">
            Leída {formatDateTime(row.original.readAt)}
          </span>
        ) : (
          <button
            type="button"
            disabled={isMarkingRead}
            onClick={() => onMarkRead(row.original.id)}
            className="rounded-full bg-atlas-accentSoft px-2.5 py-1 text-xs font-semibold text-atlas-accent hover:bg-atlas-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marcar como leída
          </button>
        ),
    },
  ];
}
