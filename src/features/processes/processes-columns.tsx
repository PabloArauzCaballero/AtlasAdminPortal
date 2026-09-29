"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { clientLabel, processTypeLabel, roleLabel } from "./labels";
import type { ProcessListItem } from "./types";

const PRIORITY_TONE = { P0: "critical", P1: "warning", P2: "muted" } as const;

function DocumentationCell({ item }: Readonly<{ item: ProcessListItem }>) {
  const doc = item.documentation;
  const passed = [
    doc.narrative,
    doc.owner,
    doc.instanceEntity,
    doc.screens,
    doc.inDatabase,
  ].filter(Boolean).length;
  return doc.complete ? (
    <Badge tone="success" dot>
      Documentado
    </Badge>
  ) : (
    <Badge tone="warning" dot>
      {`${passed} de 5`}
    </Badge>
  );
}

function WiringCell({ item }: Readonly<{ item: ProcessListItem }>) {
  const { wired, unwired, unknown, personSteps } = item.wiring;
  if (!personSteps)
    return (
      <span className="text-xs text-atlas-muted">Sin pasos de personas</span>
    );
  return (
    <span className="flex flex-wrap items-center gap-1">
      {unwired ? (
        <Badge tone="critical">{`${unwired} sin pantalla`}</Badge>
      ) : null}
      {unknown ? (
        <Badge tone="warning">{`${unknown} sin comprobar`}</Badge>
      ) : null}
      <Badge tone={unwired || unknown ? "muted" : "success"}>
        {`${wired} de ${personSteps} con pantalla`}
      </Badge>
    </span>
  );
}

/**
 * Las columnas de la tabla de procesos. Van aparte de la pantalla por la misma razón que las de
 * Flujos: la pantalla decide qué se pide y qué se filtra; esto, cómo se pinta cada celda.
 */
export function buildProcessColumns(): ColumnDef<ProcessListItem>[] {
  return [
    {
      header: "Proceso",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="min-w-[16rem] max-w-md">
          <p className="font-medium text-atlas-text">{row.original.name}</p>
          <p className="font-mono text-[11px] text-atlas-muted">
            {row.original.processId}
          </p>
        </div>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "processType",
      cell: ({ row }) => processTypeLabel(row.original.processType),
    },
    {
      header: "Prioridad",
      accessorKey: "priority",
      cell: ({ row }) => (
        <Badge
          tone={
            PRIORITY_TONE[
              row.original.priority as keyof typeof PRIORITY_TONE
            ] ?? "muted"
          }
        >
          {row.original.priority}
        </Badge>
      ),
    },
    {
      header: "Dueño",
      accessorKey: "ownerRole",
      cell: ({ row }) => roleLabel(row.original.ownerRole),
    },
    {
      header: "Dónde ocurre",
      accessorKey: "clients",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.clients.map(clientLabel).join(" · ")}
        </span>
      ),
    },
    {
      header: "Etapas",
      accessorKey: "stageCount",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.stageCount}
          <span className="text-atlas-muted">{` · ${row.original.stepCount} pasos`}</span>
        </span>
      ),
    },
    {
      id: "flowStats",
      header: "Operaciones",
      cell: ({ row }) => <FlowStatsCell item={row.original} />,
    },
    {
      id: "documentation",
      header: "Documentación",
      cell: ({ row }) => <DocumentationCell item={row.original} />,
    },
    {
      id: "wiring",
      header: "Pantallas",
      cell: ({ row }) => <WiringCell item={row.original} />,
    },
    {
      id: "actions",
      header: "Abrir",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1 text-sm">
          <Link
            className="font-medium text-atlas-accent underline"
            href={`/internal/procesos/${row.original.code}`}
          >
            Ver ficha
          </Link>
          {row.original.hasInstances ? (
            <Link
              className="text-xs text-atlas-accent underline"
              href={`/internal/procesos/${row.original.code}?tab=casos`}
            >
              Casos en curso
            </Link>
          ) : null}
        </span>
      ),
    },
  ];
}

/**
 * Críticos y verificados de cada proceso, del servidor (`flowStats`). Es lo que antes sólo enseñaba
 * «Procesos de negocio». Sin el dato (servidor anterior) se dice «—», no un cero.
 */
function FlowStatsCell({ item }: Readonly<{ item: ProcessListItem }>) {
  const stats = item.flowStats;
  if (!stats) return <span className="text-atlas-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1 text-xs">
      {stats.critical ? (
        <Badge tone="critical">{`${stats.critical} críticos`}</Badge>
      ) : null}
      <Badge tone={stats.verified ? "success" : "muted"}>
        {`${stats.verified} verificados`}
      </Badge>
    </span>
  );
}
