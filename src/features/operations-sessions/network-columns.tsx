"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BooleanBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type { SessionIpReputation, SessionSimObservation } from "./types";

export function buildIpReputationColumns(): ColumnDef<SessionIpReputation>[] {
  return [
    {
      header: "Capturado",
      accessorKey: "capturedAt",
      cell: ({ row }) => formatDateTime(row.original.capturedAt),
    },
    {
      header: "VPN",
      accessorKey: "isVpn",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isVpn} tone="warning" />
      ),
    },
    {
      header: "Proxy",
      accessorKey: "isProxy",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isProxy} tone="warning" />
      ),
    },
    {
      header: "Tor",
      accessorKey: "isTor",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isTor} tone="critical" />
      ),
    },
    {
      header: "País",
      accessorKey: "countryCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.countryCode)}
        </span>
      ),
    },
    {
      header: "Ciudad",
      accessorKey: "city",
      cell: ({ row }) => safeText(row.original.city),
    },
    {
      header: "Score de reputación",
      accessorKey: "reputationScore",
      cell: ({ row }) => formatNumber(row.original.reputationScore),
    },
  ];
}

export function buildSimObservationColumns(): ColumnDef<SessionSimObservation>[] {
  return [
    {
      header: "Capturado",
      accessorKey: "capturedAt",
      cell: ({ row }) => formatDateTime(row.original.capturedAt),
    },
    {
      header: "Operadora",
      accessorKey: "carrierName",
      cell: ({ row }) => safeText(row.original.carrierName),
    },
    {
      header: "Tipo de SIM",
      accessorKey: "simType",
      cell: ({ row }) => safeText(row.original.simType),
    },
    {
      header: "SIMs",
      accessorKey: "simCount",
      cell: ({ row }) => formatNumber(row.original.simCount),
    },
    {
      header: "Teléfono (últimos 4)",
      accessorKey: "phoneLast4",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.phoneLast4)}
        </span>
      ),
    },
  ];
}
