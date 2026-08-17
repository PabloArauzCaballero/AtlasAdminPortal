"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Badge,
  BooleanBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatNumber, safeText } from "@/shared/lib/format";
import {
  CredentialStatusBadge,
  TokenStatusBadge,
} from "./provider-auth-badges";
import type { Provider, ProviderAuthState, ProviderHealth } from "./types";

export type ProviderRow = Provider & {
  health?: ProviderHealth;
  authState?: ProviderAuthState;
};

export function buildProviderColumns(
  onOpen: (provider: ProviderRow) => void,
): ColumnDef<ProviderRow>[] {
  return [
    {
      header: "Proveedor",
      accessorKey: "code",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs font-semibold text-atlas-text">
            {row.original.code}
          </p>
          <p className="text-xs text-atlas-muted">{row.original.name}</p>
        </div>
      ),
    },
    {
      header: "Categoría",
      accessorKey: "category",
      cell: ({ row }) => safeText(row.original.category),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Modo",
      accessorKey: "defaultMode",
      cell: ({ row }) => <Badge tone="info">{row.original.defaultMode}</Badge>,
    },
    {
      header: "Salud",
      accessorKey: "health",
      cell: ({ row }) =>
        row.original.health ? (
          <StatusBadge value={row.original.health.status} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      // Separada de "Salud" a propósito: un proveedor puede responder perfectamente y aun así
      // tener la credencial vencida. Fundirlas en una sola columna es lo que hacía imposible
      // distinguir "el proveedor está caído" de "hay que rotar nuestra credencial".
      header: "Credencial",
      accessorKey: "authState",
      cell: ({ row }) =>
        row.original.authState ? (
          <CredentialStatusBadge
            value={row.original.authState.credentialStatus}
          />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Token",
      accessorKey: "tokenStatus",
      cell: ({ row }) =>
        row.original.authState ? (
          <TokenStatusBadge value={row.original.authState.tokenStatus} />
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Latencia",
      accessorKey: "latencyMs",
      cell: ({ row }) =>
        row.original.health
          ? `${formatNumber(row.original.health.latencyMs)} ms`
          : "—",
    },
    {
      header: "Costoso",
      accessorKey: "isCostly",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.isCostly} tone="critical" />
      ),
    },
    {
      header: "Aprobación manual",
      accessorKey: "requiresManualApproval",
      cell: ({ row }) => (
        <BooleanBadge value={row.original.requiresManualApproval} />
      ),
    },
    {
      header: "Detalle",
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          onClick={() => onOpen(row.original)}
        >
          Gestionar
        </Button>
      ),
    },
  ];
}
