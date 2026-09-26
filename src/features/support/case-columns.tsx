"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import {
  Badge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { SupportCase } from "./types";

/**
 * La sensibilidad se pinta porque decide quién puede abrir la ficha.
 *
 * Un caso `RESTRICTED` que no esté asignado a quien mira ni siquiera aparece en esta lista salvo
 * que sea supervisor: verlo etiquetado explica por qué la cuenta de la cola no cuadra entre dos
 * personas del mismo equipo.
 */
function SensibilidadBadge({ value }: Readonly<{ value: string }>) {
  if (value === "NORMAL") return <span className="text-atlas-muted">—</span>;
  return (
    <Badge tone={value === "RESTRICTED" ? "critical" : "warning"}>
      {value === "RESTRICTED" ? "Restringido" : "Sensible"}
    </Badge>
  );
}

export function buildSupportCaseColumns(): ColumnDef<SupportCase>[] {
  return [
    {
      header: "Caso",
      accessorKey: "caseNumber",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-mono text-xs text-atlas-text">
            {safeText(row.original.caseNumber)}
          </p>
          <p
            className="max-w-[16ch] truncate font-mono text-[0.6875rem] text-atlas-muted"
            title={row.original.caseId}
          >
            #{row.original.caseId}
          </p>
        </div>
      ),
    },
    {
      /*
       * El tipo va DEBAJO del asunto, no en columna propia.
       *
       * Con una columna para cada cosa la tabla no cabía a 1.440 px y la penúltima —«Abierto»— se
       * comprimía hasta leerse «ABI» con la fecha cortada. Es el mismo fallo que `pinRight` arregla
       * para la acción, pero clavar no ensancha: lo que sobraba era una columna.
       */
      header: "Asunto",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[34ch]">
          <p className="truncate text-xs" title={row.original.title}>
            {safeText(row.original.title)}
          </p>
          <p className="truncate font-mono text-[0.6875rem] text-atlas-muted">
            {safeText(row.original.caseType)}
          </p>
        </div>
      ),
    },
    {
      header: "Prioridad",
      accessorKey: "priority",
      cell: ({ row }) => <SeverityBadge value={row.original.priority} />,
    },
    {
      header: "Estado",
      accessorKey: "internalStatus",
      cell: ({ row }) => <StatusBadge value={row.original.internalStatus} />,
    },
    {
      header: "Sensibilidad",
      accessorKey: "sensitivity",
      cell: ({ row }) => <SensibilidadBadge value={row.original.sensitivity} />,
    },
    {
      header: "Agente",
      accessorKey: "assigneeAgentId",
      cell: ({ row }) =>
        row.original.assigneeAgentId ? (
          <span className="font-mono text-[0.6875rem]">
            #{row.original.assigneeAgentId}
          </span>
        ) : (
          <span className="text-atlas-muted">Sin asignar</span>
        ),
    },
    {
      header: "Abierto",
      accessorKey: "openedAt",
      cell: ({ row }) => formatDateTime(row.original.openedAt),
    },
    {
      header: "Acción",
      /*
       * Clavada a la derecha por la misma razón que en la cola de operaciones: con nueve columnas
       * la fila se sale de la tarjeta y el único enlace de la fila queda fuera de la pantalla, sin
       * nada que delate que hay algo más a la derecha.
       */
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Link
          href={`/internal/support/cases/${row.original.caseId}`}
          className="inline-flex items-center rounded-md border border-atlas-border px-2 py-1 text-xs text-atlas-text hover:bg-atlas-soft"
        >
          Abrir
        </Link>
      ),
    },
  ];
}
