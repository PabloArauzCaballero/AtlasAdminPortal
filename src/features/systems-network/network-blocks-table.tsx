"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { NetworkBlockHealth } from "@/features/systems/types";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, safeText } from "@/shared/lib/format";
import {
  blockDisplayName,
  catalogCountText,
  catalogStatusCopy,
  isCatalogMeasured,
  isCatalogUpToDate,
} from "./network-status-copy";

const liveTone: Record<string, "success" | "critical" | "warning" | "muted"> = {
  UP: "success",
  DOWN: "critical",
  DEGRADED: "warning",
  NOT_CONFIGURED: "muted",
};

const liveLabel: Record<string, string> = {
  UP: "En pie",
  DOWN: "Caído",
  DEGRADED: "Degradado",
  NOT_CONFIGURED: "Sin configurar",
};

/**
 * El contador enlaza al catálogo ya filtrado por este bloque. Es el gesto que cierra el
 * diagnóstico: quien ve «0 tablas» quiere comprobarlo en la lista, no volver a filtrar a mano.
 *
 * Un cero que nadie midió se escribe «Sin medir»: pintarlo como 0 decía «este sistema no tiene
 * rutas» cuando lo cierto era «nadie las ha contado», y esas dos frases piden acciones opuestas.
 */
function CatalogCount({
  value,
  measured,
  href,
}: Readonly<{ value: number; measured: boolean; href: string }>) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-atlas-accent underline",
        value === 0 && measured && "text-amber-600",
        !measured && value === 0 && "text-xs text-atlas-muted no-underline",
      )}
    >
      {catalogCountText(value, measured)}
    </Link>
  );
}

const COLUMNS: ColumnDef<NetworkBlockHealth>[] = [
  {
    header: "Sistema",
    id: "system",
    accessorFn: (block) => blockDisplayName(block),
    cell: ({ row }) => (
      <div
        data-testid={`network-block-${row.original.systemCode}`}
        className="max-w-xs"
      >
        <p className="font-medium text-atlas-text">
          {blockDisplayName(row.original)}
        </p>
        <p className="text-xs text-atlas-muted">
          {safeText(row.original.purpose)}
        </p>
      </div>
    ),
  },
  {
    header: "Estado en vivo",
    accessorKey: "liveState",
    cell: ({ row }) => (
      <div className="max-w-xs">
        <Badge tone={liveTone[row.original.liveState] ?? "muted"} dot>
          {liveLabel[row.original.liveState] ?? "Desconocido"}
        </Badge>
        <p
          className={cn(
            "mt-1 text-xs",
            row.original.liveState === "DOWN"
              ? "text-red-700"
              : "text-atlas-muted",
          )}
        >
          {safeText(row.original.healthMessage)}
        </p>
      </div>
    ),
  },
  {
    header: "Endpoints",
    id: "endpoints",
    accessorFn: (block) => block.catalog.endpoints,
    cell: ({ row }) => (
      <CatalogCount
        value={row.original.catalog.endpoints}
        measured={isCatalogMeasured(row.original)}
        href={`/internal/systems/endpoints?block=${row.original.systemCode}`}
      />
    ),
  },
  {
    header: "Tablas",
    id: "tables",
    accessorFn: (block) => block.catalog.dataEntities,
    cell: ({ row }) => (
      <CatalogCount
        value={row.original.catalog.dataEntities}
        measured={isCatalogMeasured(row.original)}
        href={`/internal/data-catalog/tables?block=${row.original.systemCode}`}
      />
    ),
  },
  {
    header: "Catálogo",
    id: "catalog",
    accessorFn: (block) =>
      catalogStatusCopy(block.kind, block.catalog.federationStatus).label,
    cell: ({ row }) => {
      const block = row.original;
      const status = catalogStatusCopy(
        block.kind,
        block.catalog.federationStatus,
      );
      return (
        <div className="max-w-sm space-y-1">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="text-xs">{status.explanation}</p>
          {block.catalog.lastSuccessAt ? (
            <p className="text-xs text-atlas-muted">
              Leído: {formatDateTime(block.catalog.lastSuccessAt)}
              {block.catalog.remoteVersion
                ? ` · versión ${block.catalog.remoteVersion}`
                : ""}
            </p>
          ) : null}
          {block.catalog.federationMessage ? (
            <details className="rounded-md bg-atlas-soft p-2 text-xs">
              <summary className="cursor-pointer font-semibold text-atlas-muted">
                Detalle técnico
              </summary>
              <p className="mt-1 break-words">
                {safeText(block.catalog.federationMessage)}
              </p>
            </details>
          ) : null}
        </div>
      );
    },
  },
  {
    header: "Si falta",
    accessorKey: "degradation",
    cell: ({ row }) => (
      <span className="block max-w-xs text-xs italic text-atlas-muted">
        {safeText(row.original.degradation)}
      </span>
    ),
  },
];

const FILTERS: LocalListFilter<NetworkBlockHealth>[] = [
  {
    name: "live",
    label: "Estado en vivo",
    tooltip:
      "Deja sólo los sistemas en ese estado de respuesta: en pie, caídos, degradados o sin configurar.",
    options: Object.entries(liveLabel).map(([value, label]) => ({
      value,
      label,
      description: `Sistemas cuya última comprobación en vivo fue «${label.toLocaleLowerCase("es")}».`,
    })),
    test: (block, value) => block.liveState === value,
  },
  {
    name: "catalog",
    label: "Catálogo",
    tooltip:
      "Separa los sistemas cuyo catálogo de rutas y tablas está al día de los que no lo han entregado.",
    options: [
      {
        value: "ok",
        label: "Al día",
        description: "Entregó su lista de rutas y tablas en la última lectura.",
      },
      {
        value: "stale",
        label: "No está al día",
        description:
          "No la ha entregado, falló la lectura o falta configurarlo.",
      },
    ],
    test: (block, value) =>
      (value === "ok") === isCatalogUpToDate(block.catalog.federationStatus),
  },
];

/** Los sistemas de Atlas con las dos verdades que hay que leer juntas: ¿responde? y ¿aporta su catálogo? */
export function NetworkBlocksTable({
  blocks,
}: Readonly<{ blocks: NetworkBlockHealth[] }>) {
  return (
    <LocalListTable
      rows={blocks}
      columns={COLUMNS}
      searchText={(block) =>
        `${blockDisplayName(block)} ${block.purpose ?? ""} ${block.healthMessage ?? ""} ${block.degradation ?? ""}`
      }
      searchPlaceholder="Buscar por sistema, propósito o mensaje…"
      searchTooltip="Recorre los sistemas de Atlas, que son pocos y llegan todos: coincide con parte del nombre, del propósito, del mensaje de salud o de lo que se pierde si falta."
      filters={FILTERS}
      emptyTitle="No hay sistemas en la red."
      emptyFilteredTitle="Ningún sistema coincide con la búsqueda."
    />
  );
}
