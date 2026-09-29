"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatNumber } from "@/shared/lib/format";
import { explainBlocker } from "../finding-codes";
import {
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "../provider-badges";
import type { ProductionGate, ReadinessReport, SlaReport } from "../types";
import {
  HEALTH_OPTIONS,
  MODE_OPTIONS,
  STATUS_OPTIONS,
  yesNoOptions,
} from "./audit-options";

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

const blockersText = (blockers: string[]) =>
  blockers.map((blocker) => explainBlocker(blocker)).join(" ");

const healthKey = (value: string | undefined | null) => {
  const upper = (value ?? "UNKNOWN").toUpperCase();
  if (["UP", "HEALTHY", "OK"].includes(upper)) return "UP";
  if (["DOWN", "UNAVAILABLE"].includes(upper)) return "DOWN";
  return upper;
};

function healthFilter<T>(
  read: (row: T) => string | undefined | null,
): LocalListFilter<T> {
  return {
    name: "health",
    label: "Salud",
    tooltip:
      "Deja sólo los proveedores con esa salud en la última comprobación: responde, degradado, caído o sin medir.",
    options: HEALTH_OPTIONS,
    test: (row, value) => healthKey(read(row)) === value,
  };
}

function modeFilter<T>(
  read: (row: T) => string | undefined | null,
): LocalListFilter<T> {
  return {
    name: "mode",
    label: "Modo",
    tooltip:
      "Deja sólo los proveedores con ese modo de llamada: simulado, sandbox o producción real.",
    options: MODE_OPTIONS,
    test: (row, value) => (read(row) ?? "").toLowerCase() === value,
  };
}

// --- Compuerta de producción --------------------------------------------------------------------

type GateProvider = ProductionGate["providers"][number];

const GATE_COLUMNS: ColumnDef<GateProvider>[] = [
  {
    header: "Proveedor",
    accessorKey: "providerCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.providerCode}
      </span>
    ),
  },
  {
    header: "Cómo se le llama",
    accessorKey: "mode",
    cell: ({ row }) => <ProviderModeBadge value={row.original.mode} />,
  },
  {
    header: "Salud",
    accessorKey: "healthStatus",
    cell: ({ row }) => (
      <ProviderHealthBadge value={row.original.healthStatus} />
    ),
  },
  {
    header: "Sirve simulado",
    accessorKey: "readyForMock",
    cell: ({ row }) => (row.original.readyForMock ? "Sí" : "No"),
  },
  {
    header: "Sirve producción",
    accessorKey: "readyForProduction",
    cell: ({ row }) => (row.original.readyForProduction ? "Sí" : "No"),
  },
  {
    header: "Bloqueos",
    id: "blockers",
    accessorFn: (provider) => blockersText(provider.blockers),
    cell: ({ row }) => (
      <span className="block max-w-md text-xs text-atlas-muted">
        {row.original.blockers.length === 0
          ? "—"
          : blockersText(row.original.blockers)}
      </span>
    ),
  },
];

export function GateProvidersTable({
  providers,
}: Readonly<{ providers: GateProvider[] }>) {
  return (
    <LocalListTable
      rows={providers}
      columns={GATE_COLUMNS}
      searchText={(provider) =>
        `${provider.providerCode} ${blockersText(provider.blockers)}`
      }
      searchPlaceholder="Buscar por proveedor o bloqueo…"
      searchTooltip="Recorre todos los proveedores de la compuerta, que llegan enteros: coincide con parte del código o del texto de un bloqueo."
      filters={[
        healthFilter<GateProvider>((provider) => provider.healthStatus),
        modeFilter<GateProvider>((provider) => provider.mode),
        {
          name: "production",
          label: "Sirve producción",
          tooltip:
            "Separa los proveedores listos para hablar con el proveedor real de los que todavía tienen bloqueos.",
          options: yesNoOptions(
            "Cumple todos los requisitos para producción.",
            "Le falta algo para poder pasar a producción.",
          ),
          test: (provider, value) =>
            (value === "yes") === provider.readyForProduction,
        },
      ]}
      emptyTitle="La compuerta no evalúa ningún proveedor."
      emptyFilteredTitle="Ningún proveedor coincide con la búsqueda."
    />
  );
}

// --- Preparación por proveedor ------------------------------------------------------------------

type ReadinessRow = ReadinessReport["readiness"][number];

const READINESS_COLUMNS: ColumnDef<ReadinessRow>[] = [
  {
    header: "Proveedor",
    accessorKey: "providerCode",
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-xs font-semibold">
          {row.original.providerCode}
        </p>
        <p className="text-xs text-atlas-muted">{row.original.name ?? "—"}</p>
      </div>
    ),
  },
  {
    header: "Tipo",
    accessorKey: "status",
    cell: ({ row }) => <ProviderStatusBadge value={row.original.status} />,
  },
  {
    header: "Cómo se le llama",
    accessorKey: "mode",
    cell: ({ row }) => <ProviderModeBadge value={row.original.mode} />,
  },
  {
    header: "Salud",
    id: "health",
    accessorFn: (item) => item.health?.status ?? "",
    cell: ({ row }) => (
      <ProviderHealthBadge value={row.original.health?.status} />
    ),
  },
  {
    header: "Políticas",
    id: "policies",
    accessorFn: (item) => item.policies?.length ?? 0,
  },
  {
    header: "Fallos recientes",
    accessorKey: "recentFailures",
    cell: ({ row }) => formatNumber(row.original.recentFailures),
  },
  {
    header: "Qué le falta",
    id: "blockers",
    accessorFn: (item) => blockersText(item.blockers),
    cell: ({ row }) => (
      <span className="block max-w-md text-xs text-atlas-muted">
        {row.original.blockers.length === 0
          ? "Nada"
          : blockersText(row.original.blockers)}
      </span>
    ),
  },
];

export function ReadinessProvidersTable({
  items,
}: Readonly<{ items: ReadinessRow[] }>) {
  return (
    <LocalListTable
      rows={items}
      columns={READINESS_COLUMNS}
      searchText={(item) =>
        `${item.providerCode} ${item.name ?? ""} ${blockersText(item.blockers)}`
      }
      searchPlaceholder="Buscar por proveedor, nombre o lo que le falta…"
      searchTooltip="Recorre todos los proveedores del informe, que llegan enteros: coincide con parte del código, del nombre o del texto de lo que le falta."
      filters={[
        {
          name: "status",
          label: "Tipo",
          tooltip:
            "Deja sólo los proveedores con ese estado de catálogo: activo, deshabilitado, sólo simulado o sólo sandbox.",
          options: STATUS_OPTIONS,
          test: (item, value) => item.status.toUpperCase() === value,
        },
        modeFilter<ReadinessRow>((item) => item.mode),
        healthFilter<ReadinessRow>((item) => item.health?.status),
      ]}
      emptyTitle="El informe no trae proveedores."
      emptyFilteredTitle="Ningún proveedor coincide con la búsqueda."
    />
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
