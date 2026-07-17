"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BooleanBadge } from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { SessionDeviceRiskEvent, SessionDeviceSnapshot } from "./types";

export function buildDeviceSnapshotColumns(): ColumnDef<SessionDeviceSnapshot>[] {
  return [
    {
      header: "Capturado",
      accessorKey: "capturedAt",
      cell: ({ row }) => formatDateTime(row.original.capturedAt),
    },
    {
      header: "Versión de app",
      accessorKey: "appVersion",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.appVersion)}
        </span>
      ),
    },
    {
      header: "VPN",
      accessorKey: "vpnDetected",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.vpnDetected} tone="warning" />
      ),
    },
    {
      header: "Rooteado",
      accessorKey: "isRooted",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isRooted} tone="critical" />
      ),
    },
    {
      header: "Emulador",
      accessorKey: "isEmulator",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isEmulator} tone="critical" />
      ),
    },
  ];
}

export function buildDeviceRiskEventColumns(): ColumnDef<SessionDeviceRiskEvent>[] {
  return [
    {
      header: "Ocurrió",
      accessorKey: "happenedAt",
      cell: ({ row }) => formatDateTime(row.original.happenedAt),
    },
    {
      header: "Tipo de evento",
      accessorKey: "eventType",
      cell: ({ row }) => safeText(row.original.eventType),
    },
    {
      header: "Reason code",
      accessorKey: "reasonCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.reasonCode)}
        </span>
      ),
    },
  ];
}
