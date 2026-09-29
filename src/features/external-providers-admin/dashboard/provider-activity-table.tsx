"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Play } from "lucide-react";
import { useMemo } from "react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import {
  HEALTH_OPTIONS,
  MODE_OPTIONS,
  yesNoOptions,
} from "../audit/audit-options";
import { explainStatus } from "../finding-codes";
import { ProviderHealthBadge, ProviderModeBadge } from "../provider-badges";
import type { DashboardProvider } from "../types";
import { HealthSparkline } from "./health-sparkline";

/**
 * La latencia sólo se puede afirmar cuando alguien la midió.
 *
 * Hoy el único modo que sale a la red es `mock_server`: en los demás —incluidos `sandbox` y
 * `production`, cuyos adaptadores no tienen integración real todavía— `checkMockHealth` devuelve
 * `UP` con `0 ms` sin llamar a nadie, y pintar «Responde · 0 ms» afirma una comprobación que no
 * ocurrió.
 *
 * Por eso la condición mira el RESULTADO y no sólo el modo: en cuanto `production` mida de verdad,
 * su latencia dejará de ser cero y esto se vuelve cierto solo, sin que nadie recuerde tocarlo.
 */
export function isMeasured(mode: string, latencyMs?: number | null): boolean {
  // `mock_server` primero y sin mirar la latencia: el chequeo de salud contra el emulador es un
  // ida y vuelta local que se mide en 1 ms, así que puede redondear a 0 y seguir siendo una
  // medición real. Medido en el VPS el 2026-09-10: entre 1 y 49 ms en los ocho.
  if (mode === "mock_server") return true;
  // Y al revés: una latencia positiva vale aunque el modo no sea `mock_server`, para que el día
  // que `production` mida de verdad esto se vuelva cierto solo.
  return typeof latencyMs === "number" && latencyMs > 0;
}

function toneForHealth(
  provider: DashboardProvider,
): "success" | "warning" | "critical" | "muted" {
  // Con la latencia, igual que la insignia: sin ella, un proveedor que sí midió fuera de
  // `mock_server` quedaba en gris mientras su insignia decía «Responde».
  if (!provider.health || !isMeasured(provider.mode, provider.health.latencyMs))
    return "muted";
  if (provider.health.status === "UP") return "success";
  if (provider.health.status === "DEGRADED") return "warning";
  return "critical";
}

const measured = (provider: DashboardProvider) =>
  isMeasured(provider.mode, provider.health?.latencyMs);

/** «Sin llamada» no es una salud: es que nadie la midió. Va como una opción más del filtro. */
const HEALTH_FILTER_OPTIONS = [
  ...HEALTH_OPTIONS.filter((option) => option.value !== "UNKNOWN"),
  {
    value: "NOT_MEASURED",
    label: "Sin llamada",
    description:
      "Nadie ha llamado al proveedor de verdad, así que su salud no se ha medido.",
  },
];

function healthOf(provider: DashboardProvider): string {
  if (!measured(provider)) return "NOT_MEASURED";
  const status = (provider.health?.status ?? "UNKNOWN").toUpperCase();
  return status === "HEALTHY" || status === "OK" ? "UP" : status;
}

const FILTERS: LocalListFilter<DashboardProvider>[] = [
  {
    name: "health",
    label: "Salud",
    tooltip:
      "Deja sólo los proveedores con esa salud. «Sin llamada» son los que nadie ha llamado de verdad, y su salud no está medida.",
    options: HEALTH_FILTER_OPTIONS,
    test: (provider, value) => healthOf(provider) === value,
  },
  {
    name: "mode",
    label: "Modo",
    tooltip:
      "Deja sólo los proveedores con ese modo de llamada: simulado, sandbox o producción real.",
    options: MODE_OPTIONS,
    test: (provider, value) => provider.mode.toLowerCase() === value,
  },
  {
    name: "errors",
    label: "Último error",
    tooltip:
      "Separa los proveedores cuya última llamada fallida quedó registrada de los que no tienen ningún error.",
    options: yesNoOptions(
      "Tienen un error registrado en el período.",
      "No tienen ningún error registrado en el período.",
    ),
    test: (provider, value) =>
      (value === "yes") === Boolean(provider.activity.lastErrorStatus),
  },
];

/**
 * Una fila por proveedor: cómo se le llama, si responde, cuánto tardó y qué pasó con las llamadas
 * del período.
 *
 * El orden de las columnas es deliberado: primero cuántas llamadas hubo, porque si no hubo ninguna
 * el resto de las cifras no significan nada, y una tasa de éxito sobre cero llamadas leída como
 * «0 %» es la forma más rápida de dar por caído a un proveedor que nadie usó.
 */
export function ProviderActivityTable({
  providers,
  onSimulate,
}: Readonly<{
  providers: DashboardProvider[];
  onSimulate: (provider: DashboardProvider) => void;
}>) {
  const columns = useMemo<ColumnDef<DashboardProvider>[]>(
    () => [
      {
        header: "Proveedor",
        accessorKey: "providerCode",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold">
              {row.original.providerCode}
            </p>
            <p className="text-xs text-atlas-muted">
              {row.original.name ?? "—"}
            </p>
          </div>
        ),
      },
      {
        header: "Modo",
        accessorKey: "mode",
        cell: ({ row }) => (
          <span className="[&_span]:whitespace-nowrap">
            <ProviderModeBadge value={row.original.mode} />
          </span>
        ),
      },
      {
        header: "Salud",
        id: "health",
        accessorFn: healthOf,
        cell: ({ row }) =>
          measured(row.original) ? (
            <ProviderHealthBadge value={row.original.health?.status} />
          ) : (
            <Badge tone="muted">Sin llamada</Badge>
          ),
      },
      {
        header: "Latencia reciente",
        id: "trend",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="w-32">
            <HealthSparkline
              points={measured(row.original) ? row.original.healthSeries : []}
              tone={toneForHealth(row.original)}
            />
          </div>
        ),
      },
      {
        header: "Llamadas",
        id: "calls",
        accessorFn: (provider) => provider.activity.total,
        cell: ({ row }) => formatNumber(row.original.activity.total),
      },
      {
        header: "Éxito",
        id: "successRate",
        accessorFn: (provider) => provider.activity.successRate ?? -1,
        cell: ({ row }) =>
          row.original.activity.successRate === null
            ? "—"
            : `${formatNumber(row.original.activity.successRate)} %`,
      },
      {
        header: "Latencia p95",
        id: "p95",
        accessorFn: (provider) => provider.activity.p95LatencyMs ?? -1,
        cell: ({ row }) =>
          row.original.activity.p95LatencyMs === null
            ? "—"
            : `${formatNumber(row.original.activity.p95LatencyMs)} ms`,
      },
      {
        header: "Última llamada",
        id: "last",
        accessorFn: (provider) => provider.activity.lastRequestAt ?? "",
        cell: ({ row }) => {
          const { activity, health } = row.original;
          if (activity.total === 0)
            return (
              <span className="text-xs text-atlas-muted">
                {health
                  ? `Último chequeo: ${formatDateTime(health.checkedAt)}`
                  : "—"}
              </span>
            );
          return formatDateTime(activity.lastRequestAt);
        },
      },
      {
        header: "Último error",
        id: "lastError",
        accessorFn: (provider) => provider.activity.lastErrorStatus ?? "",
        cell: ({ row }) => {
          const { activity } = row.original;
          if (!activity.lastErrorStatus) return "—";
          return (
            <div className="max-w-xs text-xs text-red-800">
              <p className="font-medium">
                {explainStatus(activity.lastErrorStatus).label}
              </p>
              {activity.lastErrorMessage ? (
                <p>{activity.lastErrorMessage}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => (
          <Button variant="ghost" onClick={() => onSimulate(row.original)}>
            {measured(row.original) ? (
              <Play className="h-4 w-4" aria-hidden />
            ) : (
              <Activity className="h-4 w-4" aria-hidden />
            )}
            Simular
          </Button>
        ),
      },
    ],
    [onSimulate],
  );

  return (
    <LocalListTable
      rows={providers}
      columns={columns}
      searchText={(provider) =>
        `${provider.providerCode} ${provider.name ?? ""} ${provider.activity.lastErrorMessage ?? ""}`
      }
      searchPlaceholder="Buscar por proveedor, nombre o error…"
      searchTooltip="Recorre todos los proveedores del tablero, que llegan enteros del servidor: coincide con parte del código, del nombre o del mensaje del último error."
      filters={FILTERS}
      emptyTitle="No hay proveedores registrados."
      emptyFilteredTitle="Ningún proveedor coincide con la búsqueda."
    />
  );
}
