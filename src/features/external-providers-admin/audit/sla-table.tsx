"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatNumber } from "@/shared/lib/format";
import type { SlaReport } from "../types";
import { yesNoOptions } from "./audit-options";

/**
 * Barra de tasa de éxito.
 *
 * El número solo obliga a comparar mentalmente ocho porcentajes; la barra los ordena de un
 * vistazo. `null` es «no hubo llamadas», que no es 0 % y no se pinta como una barra vacía —eso
 * se leería como fracaso total.
 */
function SuccessBar({ rate }: Readonly<{ rate: number | null }>) {
  if (rate === null)
    return <span className="text-atlas-muted">Sin llamadas</span>;
  const tone =
    rate >= 95 ? "bg-emerald-500" : rate >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${Math.max(2, Math.min(100, rate))}%` }}
        />
      </div>
      <span className="tabular-nums">{formatNumber(rate)} %</span>
    </div>
  );
}

// --- Cumplimiento por proveedor -----------------------------------------------------------------

type SlaRow = SlaReport["providers"][number];

const SLA_COLUMNS: ColumnDef<SlaRow>[] = [
  {
    header: "Proveedor",
    accessorKey: "providerCode",
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-xs font-semibold">
          {row.original.providerCode}
        </p>
        {row.original.warnings.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {row.original.warnings.map((warning) => (
              <Badge key={warning} tone="warning" icon={TriangleAlert}>
                {warning}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    header: "Llamadas",
    accessorKey: "total",
    cell: ({ row }) => formatNumber(row.original.total),
  },
  {
    header: "Éxito",
    accessorKey: "successRate",
    cell: ({ row }) => <SuccessBar rate={row.original.successRate} />,
  },
  {
    header: "Fallos",
    accessorKey: "failed",
    cell: ({ row }) => formatNumber(row.original.failed),
  },
  {
    header: "Bloqueadas",
    accessorKey: "blocked",
    cell: ({ row }) => formatNumber(row.original.blocked),
  },
  {
    header: "Límite",
    accessorKey: "rateLimited",
    cell: ({ row }) => formatNumber(row.original.rateLimited),
  },
  {
    header: "Credencial",
    accessorKey: "authFailed",
    cell: ({ row }) => formatNumber(row.original.authFailed),
  },
  {
    header: "p95",
    accessorKey: "p95LatencyMs",
    cell: ({ row }) =>
      row.original.p95LatencyMs === null
        ? "—"
        : `${formatNumber(row.original.p95LatencyMs)} ms`,
  },
  {
    header: "Costo",
    accessorKey: "actualCost",
    cell: ({ row }) => formatNumber(row.original.actualCost),
  },
];

export function SlaProvidersTable({
  providers,
}: Readonly<{ providers: SlaRow[] }>) {
  return (
    <LocalListTable
      rows={providers}
      columns={SLA_COLUMNS}
      searchText={(provider) =>
        `${provider.providerCode} ${provider.warnings.join(" ")}`
      }
      searchPlaceholder="Buscar por proveedor o aviso…"
      searchTooltip="Recorre todos los proveedores del período, que llegan enteros: coincide con parte del código o de un aviso."
      filters={[
        {
          name: "warnings",
          label: "Avisos",
          tooltip:
            "Separa los proveedores con algún aviso en el período (fallos, bloqueos, límite) de los que salieron limpios.",
          options: yesNoOptions(
            "Tienen al menos un aviso en el período.",
            "No tienen ningún aviso en el período.",
          ),
          test: (provider, value) =>
            (value === "yes") === provider.warnings.length > 0,
        },
      ]}
      emptyTitle="No se llamó a ningún proveedor en este período."
      emptyFilteredTitle="Ningún proveedor coincide con la búsqueda."
    />
  );
}
