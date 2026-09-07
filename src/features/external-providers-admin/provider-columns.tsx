"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Coins, Settings2, UserRoundCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatNumber } from "@/shared/lib/format";
import {
  CredentialStatusBadge,
  TokenStatusBadge,
} from "./provider-auth-badges";
import {
  ProviderCategoryLabel,
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "./provider-badges";
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
      cell: ({ row }) => (
        <ProviderCategoryLabel value={row.original.category} />
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <ProviderStatusBadge value={row.original.status} />,
    },
    {
      header: "Modo",
      accessorKey: "defaultMode",
      cell: ({ row }) => <ProviderModeBadge value={row.original.defaultMode} />,
    },
    {
      header: "Salud",
      accessorKey: "health",
      cell: ({ row }) =>
        row.original.health ? (
          <ProviderHealthBadge value={row.original.health.status} />
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
        row.original.health ? (
          <span className="whitespace-nowrap tabular-nums">
            {formatNumber(row.original.health.latencyMs)} ms
          </span>
        ) : (
          "—"
        ),
    },
    {
      /*
       * «Costoso» y «Aprobación manual» eran dos columnas con un «Sí/No» cada una.
       *
       * Dos columnas enteras para decir «no» once veces de doce: ocupaban casi 350 px para,
       * en la práctica, no marcar nada, y eran las que empujaban el botón de gestión fuera de
       * la pantalla. Aquí sólo aparece lo que ES cierto, con su icono; una fila sin marcas es
       * un proveedor sin restricciones, que es como se lee una lista de excepciones.
       */
      header: "Política",
      accessorKey: "isCostly",
      cell: ({ row }) => {
        const costoso = row.original.isCostly;
        const manual = row.original.requiresManualApproval;
        if (!costoso && !manual) {
          return <span className="text-atlas-muted">—</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {costoso ? (
              <Badge tone="critical" icon={Coins}>
                Costoso
              </Badge>
            ) : null}
            {manual ? (
              <Badge tone="warning" icon={UserRoundCheck}>
                Aprobación manual
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Detalle",
      // Clavada a la derecha: es la acción de la fila y la tabla se desplaza en horizontal.
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          onClick={() => onOpen(row.original)}
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          Gestionar
        </Button>
      ),
    },
  ];
}
