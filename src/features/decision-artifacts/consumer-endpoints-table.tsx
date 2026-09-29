"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { MethodBadge } from "@/shared/components/ui/badges";
import type { DecisionArtifactBinding } from "./types";

type ConsumerEndpoint = NonNullable<
  DecisionArtifactBinding["consumerEndpoints"]
>[number];

const API_DOCS =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") ?? "";

const COLUMNS: ColumnDef<ConsumerEndpoint>[] = [
  {
    header: "Operación",
    id: "endpoint",
    accessorFn: (endpoint) => `${endpoint.method} ${endpoint.path}`,
    cell: ({ row }) => (
      <a
        href={`${API_DOCS}/docs`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-atlas-accent hover:underline"
      >
        <MethodBadge method={row.original.method} />
        {row.original.path}
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      </a>
    ),
  },
  {
    header: "Para qué la llama",
    accessorKey: "purpose",
    cell: ({ row }) => (
      <span className="block max-w-md text-xs text-atlas-muted">
        {row.original.purpose}
      </span>
    ),
  },
];

/** Los endpoints que disparan esta decisión: si cambias la política, esto es lo que se ve afectado. */
export function ConsumerEndpointsTable({
  endpoints,
}: Readonly<{ endpoints: ConsumerEndpoint[] }>) {
  return (
    <LocalListTable
      rows={endpoints}
      columns={COLUMNS}
      searchText={(endpoint) =>
        `${endpoint.method} ${endpoint.path} ${endpoint.purpose}`
      }
      searchPlaceholder="Buscar por método, ruta o para qué se llama…"
      searchTooltip="Recorre las operaciones de esta decisión, que son pocos y llegan todos con su ficha: coincide con parte del método, de la ruta o de su propósito."
      emptyTitle="Ninguna operación dispara esta decisión."
      emptyFilteredTitle="Ninguna operación coincide con la búsqueda."
    />
  );
}
