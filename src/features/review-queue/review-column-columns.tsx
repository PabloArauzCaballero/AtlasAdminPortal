"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReviewQueueColumn } from "@/features/systems/types";
import { PiiBadge, ReviewStatusBadge } from "@/shared/components/ui/badges";
import { ReviewActions } from "./review-actions";
import type { Decision, SetPendingReview } from "./review-column-types";

/**
 * Columnas de la sección «Columnas de datos».
 *
 * Es la sexta ruta de revisión (`PATCH /systems/data-entities/columns/:id/review`) y la única que
 * no tenía pantalla: la cola ya devolvía el cubo `dataColumnImpacts`, pero nadie lo pintaba, así
 * que marcar una columna como dato personal o descartar la detección sólo podía hacerse por SQL.
 */
export function buildColumnReviewColumns(
  setPending: SetPendingReview,
  canReview: boolean,
): ColumnDef<ReviewQueueColumn>[] {
  return [
    {
      header: "Columna",
      accessorKey: "columnName",
      cell: ({ row }) => {
        const { schemaName, tableName, columnName, dataEntityId } =
          row.original;
        const label = `${schemaName}.${tableName}.${columnName}`;
        return dataEntityId ? (
          <Link
            className="font-mono text-xs text-atlas-accent underline"
            href={`/internal/data-catalog/tables/${dataEntityId}`}
          >
            {label}
          </Link>
        ) : (
          <span className="font-mono text-xs">{label}</span>
        );
      },
    },
    {
      header: "Nombre de negocio",
      accessorKey: "businessName",
      cell: ({ row }) => row.original.businessName ?? "—",
    },
    {
      header: "Tipo",
      accessorKey: "dataType",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.dataType ?? "—"}
        </span>
      ),
    },
    {
      header: "Datos personales",
      accessorKey: "containsPii",
      cell: ({ row }) => <PiiBadge value={row.original.containsPii ?? false} />,
    },
    {
      header: "Revisión",
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <ReviewStatusBadge value={row.original.reviewStatus} />
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      cell: ({ row }) => (
        <ReviewActions
          canReview={canReview}
          onDecision={(decision: Decision) =>
            setPending({
              targetType: "column",
              targetId: row.original.columnId,
              title: `${row.original.tableName}.${row.original.columnName}`,
              decision,
            })
          }
        />
      ),
    },
  ];
}
