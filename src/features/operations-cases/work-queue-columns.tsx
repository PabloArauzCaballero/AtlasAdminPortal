"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Badge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { engineExecutionUrl } from "@/shared/decision-engine/engine-links";
import { ExternalLink } from "lucide-react";
import type { WorkQueueItem } from "./types";

function WorkItemTypeBadge({
  value,
}: Readonly<{ value: WorkQueueItem["workItemType"] }>) {
  return (
    <Badge tone={value === "fraud" ? "critical" : "info"}>
      {value === "fraud" ? "Fraude" : "Revisión manual"}
    </Badge>
  );
}

export function buildWorkQueueColumns(
  onDecide: (item: WorkQueueItem) => void,
): ColumnDef<WorkQueueItem>[] {
  return [
    {
      header: "Tipo",
      accessorKey: "workItemType",
      cell: ({ row }) => (
        <WorkItemTypeBadge value={row.original.workItemType} />
      ),
    },
    {
      header: "Caso",
      accessorKey: "caseCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {safeText(row.original.caseCode)} #{row.original.caseId}
        </span>
      ),
    },
    {
      header: "Cliente",
      accessorKey: "customerId",
      cell: ({ row }) =>
        row.original.customerId ? (
          <Link
            href={`/internal/operations/customers/${row.original.customerId}/investigation-summary`}
            className="font-mono text-xs text-atlas-accent underline"
          >
            #{row.original.customerId}
          </Link>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Prioridad",
      accessorKey: "priority",
      cell: ({ row }) => <SeverityBadge value={row.original.priority} />,
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Motivo",
      accessorKey: "reasonCode",
      cell: ({ row }) => safeText(row.original.reasonCode),
    },
    {
      header: "Abierto",
      accessorKey: "openedAt",
      cell: ({ row }) => formatDateTime(row.original.openedAt),
    },
    {
      header: "Acción",
      cell: ({ row }) => (
        <AccionDeFila item={row.original} onDecide={onDecide} />
      ),
    },
  ];
}

/**
 * Decidir aquí, o ir a decidir donde toca.
 *
 * Un caso que resolvió el Motor ya tiene su propia bandeja allí, con el expediente y la petición de
 * información. Ofrecer un segundo botón «Decidir» ponía a dos personas a resolver el mismo caso sin
 * verse; el backend ya lo rechaza, así que el botón sólo servía para llevar a un error. En su lugar
 * se enseña el camino a la bandeja que manda.
 */
function AccionDeFila({
  item,
  onDecide,
}: Readonly<{
  item: WorkQueueItem;
  onDecide: (item: WorkQueueItem) => void;
}>) {
  const enlace = engineExecutionUrl(item.decisionExecutionId);
  if (item.decisionExecutionId) {
    return enlace ? (
      <a
        href={enlace}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-2 py-1 text-xs text-atlas-text hover:bg-atlas-soft"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Decidir en el Motor
      </a>
    ) : (
      <span
        className="text-xs text-atlas-muted"
        title={`Ejecución ${item.decisionExecutionId}`}
      >
        Se decide en el Motor
      </span>
    );
  }

  const closed = ["closed", "resolved"].includes(
    (item.status ?? "").toLowerCase(),
  );
  return (
    <Button
      className="h-8 px-2 text-xs"
      disabled={closed}
      title={closed ? "Este caso ya está cerrado." : undefined}
      onClick={() => onDecide(item)}
    >
      Decidir
    </Button>
  );
}
