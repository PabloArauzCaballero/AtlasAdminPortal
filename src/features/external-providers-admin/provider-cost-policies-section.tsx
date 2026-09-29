"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Coins, Pencil, ShieldAlert, X } from "lucide-react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { CostPolicyEditForm } from "./cost-policy-edit-form";
import { useProviderCostPolicies, useUpdateCostPolicyMutation } from "./hooks";
import {
  ETIQUETA_DE_TRAMO,
  etiquetaTipoConsulta,
  type TramoDeCosto,
} from "./provider-display";
import type { CostPolicy } from "./types";

/**
 * El tramo de costo es un semáforo de gasto, no una etiqueta suelta.
 *
 * Todos salían en ámbar: `FREE` y `CRITICAL` se pintaban igual, que es justo la distinción que
 * esta columna existe para hacer.
 */
const TONO_DE_TRAMO: Record<
  NonNullable<CostPolicy["costTier"]>,
  "success" | "info" | "warning" | "critical"
> = {
  FREE: "success",
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "critical",
  CRITICAL: "critical",
};

const FILTROS: LocalListFilter<CostPolicy>[] = [
  {
    name: "active",
    label: "Estado",
    tooltip:
      "Separa las políticas que hoy se aplican de las que están apagadas y no frenan ninguna consulta.",
    options: [
      {
        value: "yes",
        label: "Activas",
        description: "Se aplican a las consultas de este proveedor ahora.",
      },
      {
        value: "no",
        label: "Inactivas",
        description: "Están apagadas: no ponen tope ni piden aprobación.",
      },
    ],
    test: (policy, value) => (value === "yes") === policy.active,
  },
  {
    name: "tier",
    label: "Nivel de costo",
    tooltip:
      "Deja sólo las políticas de ese nivel de gasto por consulta, de «sin costo» a «crítico».",
    options: (Object.keys(ETIQUETA_DE_TRAMO) as TramoDeCosto[]).map(
      (value) => ({
        value,
        label: ETIQUETA_DE_TRAMO[value],
        description: `Políticas cuyo nivel de costo es «${ETIQUETA_DE_TRAMO[value].toLocaleLowerCase("es")}».`,
      }),
    ),
    test: (policy, value) => policy.costTier === value,
  },
];

export function ProviderCostPoliciesSection({
  providerCode,
}: Readonly<{ providerCode: string }>) {
  const policies = useProviderCostPolicies(providerCode);
  const [editing, setEditing] = useState<CostPolicy | null>(null);
  const update = useUpdateCostPolicyMutation(providerCode);

  const columns = useMemo<ColumnDef<CostPolicy>[]>(
    () => [
      {
        header: "Consulta",
        id: "queryType",
        accessorFn: (policy) => etiquetaTipoConsulta(policy.queryType),
        cell: ({ row }) => (
          <span className="font-medium">
            {etiquetaTipoConsulta(row.original.queryType)}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "active",
        cell: ({ row }) => (
          <Badge tone={row.original.active ? "success" : "muted"}>
            {row.original.active ? "Activa" : "Inactiva"}
          </Badge>
        ),
      },
      {
        header: "Nivel de costo",
        accessorKey: "costTier",
        cell: ({ row }) =>
          row.original.costTier ? (
            <Badge tone={TONO_DE_TRAMO[row.original.costTier]} icon={Coins}>
              {ETIQUETA_DE_TRAMO[row.original.costTier]}
            </Badge>
          ) : (
            "—"
          ),
      },
      {
        header: "Reglas",
        id: "rules",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.blockByDefault ? (
              <Badge tone="critical" icon={ShieldAlert}>
                Bloquea por defecto
              </Badge>
            ) : null}
            {row.original.requiresManualApproval ? (
              <Badge tone="info">Requiere aprobación</Badge>
            ) : null}
            {!row.original.blockByDefault &&
            !row.original.requiresManualApproval
              ? "—"
              : null}
          </div>
        ),
      },
      {
        header: "Costo por consulta",
        id: "unitCost",
        accessorFn: (policy) => Number(policy.unitCostAmount ?? 0),
        cell: ({ row }) =>
          `${safeText(row.original.unitCostAmount)} ${safeText(row.original.currency)}`,
      },
      {
        header: "Máx./día usuario",
        accessorKey: "maxQueriesPerUserPerDay",
        cell: ({ row }) => formatNumber(row.original.maxQueriesPerUserPerDay),
      },
      {
        header: "Máx./día global",
        accessorKey: "maxQueriesGlobalPerDay",
        cell: ({ row }) => formatNumber(row.original.maxQueriesGlobalPerDay),
      },
      {
        id: "actions",
        header: "Acciones",
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => (
          <Button
            className="h-7 px-2 text-xs"
            onClick={() =>
              setEditing(editing?.id === row.original.id ? null : row.original)
            }
          >
            {editing?.id === row.original.id ? (
              <X className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            )}
            {editing?.id === row.original.id ? "Cerrar" : "Editar"}
          </Button>
        ),
      },
    ],
    [editing],
  );

  if (policies.isLoading) return <LoadingSkeleton rows={3} />;
  if (policies.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(policies.error)
            ? policies.error.message
            : "No se pudieron cargar las políticas de costo."
        }
        requestId={
          isAtlasApiError(policies.error) ? policies.error.requestId : undefined
        }
        onRetry={() => void policies.refetch()}
      />
    );
  }

  const items = policies.data ?? [];
  return (
    <>
      <LocalListTable
        rows={items}
        columns={columns}
        searchText={(policy) =>
          `${etiquetaTipoConsulta(policy.queryType)} ${policy.queryType} ${policy.currency ?? ""}`
        }
        searchPlaceholder="Buscar por tipo de consulta o moneda…"
        searchTooltip="Recorre las políticas de costo de este proveedor, que son pocas y llegan todas: coincide con parte del tipo de consulta o de la moneda."
        filters={FILTROS}
        emptyTitle="Este proveedor no tiene políticas de costo configuradas."
        emptyFilteredTitle="Ninguna política coincide con la búsqueda."
        emptyDescription="La auditoría de calidad lo marca como hallazgo: sin política no hay tope de gasto."
      />
      {editing ? (
        <div className="mt-3 rounded-lg border border-atlas-border p-3">
          <p className="text-sm font-semibold">
            Editando: {etiquetaTipoConsulta(editing.queryType)}
          </p>
          <CostPolicyEditForm
            key={editing.id}
            policy={editing}
            onSubmit={(body) =>
              update.mutate(
                { queryType: editing.queryType, body },
                { onSuccess: () => setEditing(null) },
              )
            }
            isPending={update.isPending}
            error={update.error}
          />
        </div>
      ) : null}
    </>
  );
}
