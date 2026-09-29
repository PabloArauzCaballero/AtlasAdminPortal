"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  ToolLiveBadge,
  toolLiveState,
  type ToolLiveState,
} from "@/features/systems/tool-live-state";
import type { ToolHealth } from "@/features/systems/types";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { safeText } from "@/shared/lib/format";

const LIVE_OPTIONS: Array<{
  value: ToolLiveState;
  label: string;
  description: string;
}> = [
  {
    value: "UP",
    label: "Operativa",
    description: "El chequeo en vivo respondió bien la última vez.",
  },
  {
    value: "DOWN",
    label: "Caída",
    description:
      "El chequeo en vivo falló: es la señal que dispara los avisos.",
  },
  {
    value: "NO_PROBE",
    label: "Sin chequeo en vivo",
    description:
      "Sólo se comprueba su configuración: nadie la llama para ver si responde.",
  },
  {
    value: "NOT_APPLICABLE",
    label: "No aplica monitoreo",
    description:
      "No hay nada que probar en ejecución (herramientas de desarrollo o planificadas).",
  },
];

const CRITICAL_OPTIONS = [
  {
    value: "yes",
    label: "Críticas",
    description: "Si caen, se corta un servicio del que depende el negocio.",
  },
  {
    value: "no",
    label: "No críticas",
    description: "Su caída molesta pero no corta un servicio esencial.",
  },
];

const CHECK_LABEL: Record<string, string> = {
  LIVE: "En vivo",
  CONFIGURATION: "Sólo configuración",
  NOT_APPLICABLE: "No aplica",
};

const FILTERS: LocalListFilter<ToolHealth>[] = [
  {
    name: "live",
    label: "Estado en vivo",
    tooltip:
      "Deja sólo las herramientas en ese estado, medido con la misma señal que dispara los avisos de servicio caído.",
    options: LIVE_OPTIONS,
    test: (tool, value) => toolLiveState(tool) === value,
  },
  {
    name: "critical",
    label: "Criticidad",
    tooltip:
      "Separa las herramientas críticas —cuya caída corta un servicio— de las que no lo son.",
    options: CRITICAL_OPTIONS,
    test: (tool, value) => (value === "yes") === Boolean(tool.isCritical),
  },
];

const identity = (tool: ToolHealth) =>
  `${tool.name ?? ""} ${tool.code ?? ""} ${tool.healthMessage ?? ""}`;

/**
 * El estado vivo de las herramientas, en tabla. Lo comparten la pestaña «Salud» de Herramientas
 * (`compact = false`, con todas las columnas) y el tablero de Inicio (`compact`, sólo quién y cómo
 * está). La lista llega ENTERA de `/systems/health/tools`: es el chequeo de todas a la vez.
 */
export function ToolsHealthTable({
  tools,
  compact = false,
}: Readonly<{ tools: ToolHealth[]; compact?: boolean }>) {
  const columns = useMemo<ColumnDef<ToolHealth>[]>(() => {
    const base: ColumnDef<ToolHealth>[] = [
      {
        header: "Herramienta",
        id: "tool",
        accessorFn: (tool) => tool.name ?? tool.code ?? "",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-atlas-text">
              {safeText(row.original.name ?? row.original.code)}
            </p>
            <p className="font-mono text-xs text-atlas-muted">
              {safeText(row.original.code)}
            </p>
          </div>
        ),
      },
      {
        header: "Estado en vivo",
        id: "live",
        accessorFn: (tool) => toolLiveState(tool),
        cell: ({ row }) => <ToolLiveBadge tool={row.original} />,
      },
    ];
    if (compact) return base;
    return [
      ...base,
      {
        header: "Catálogo",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Crítica",
        id: "critical",
        accessorFn: (tool) => (tool.isCritical ? "Sí" : "No"),
      },
      {
        header: "Chequeo",
        id: "checkType",
        accessorFn: (tool) => CHECK_LABEL[tool.checkType ?? ""] ?? "—",
      },
      {
        header: "Qué dice",
        id: "message",
        cell: ({ row }) => {
          const missing = Array.isArray(row.original.missingEnvVars)
            ? row.original.missingEnvVars
            : [];
          return (
            <div className="max-w-md text-xs">
              <p
                className={
                  toolLiveState(row.original) === "DOWN"
                    ? "text-red-700"
                    : "text-atlas-muted"
                }
              >
                {row.original.healthMessage
                  ? safeText(row.original.healthMessage)
                  : "—"}
              </p>
              {missing.length > 0 ? (
                <p className="mt-1 break-words font-mono text-atlas-muted">
                  Faltan: {missing.join(", ")}
                </p>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [compact]);

  return (
    <LocalListTable
      rows={tools}
      columns={columns}
      searchText={identity}
      searchPlaceholder="Buscar por herramienta, código o mensaje…"
      searchTooltip="Recorre todas las herramientas, que llegan enteras del chequeo de salud: coincide con parte del nombre, del código o del mensaje."
      filters={FILTERS}
      emptyTitle="No hay herramientas con chequeo de salud."
      emptyFilteredTitle="Ninguna herramienta coincide con la búsqueda."
    />
  );
}
