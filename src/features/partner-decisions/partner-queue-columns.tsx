"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { PartnerQueueItem } from "./types";

/**
 * La cola de expedientes por verificar.
 *
 * La razón social manda y el NIT va debajo: es la pareja con la que se comprueba un comercio contra
 * el padrón, y separarlos en dos columnas obligaba a cruzar la vista de un lado a otro de la fila.
 */
export function buildPartnerQueueColumns(
  onAbrir: (expediente: PartnerQueueItem) => void,
): ColumnDef<PartnerQueueItem>[] {
  return [
    {
      accessorKey: "legalName",
      header: "Comercio",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-atlas-text">
            {safeText(row.original.legalName ?? row.original.tradeName)}
          </p>
          <p className="truncate font-mono text-xs text-atlas-muted">
            {`NIT ${safeText(row.original.taxId)}`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "tradeName",
      header: "Nombre de fachada",
      cell: ({ row }) => safeText(row.original.tradeName),
    },
    {
      accessorKey: "submittedAt",
      header: "Enviado",
      cell: ({ row }) => formatDateTime(row.original.submittedAt),
    },
    {
      id: "veredicto",
      header: "Decidió",
      /*
       * Quién decidió, no sólo en qué estado quedó. Un expediente «en revisión» porque el Motor lo
       * derivó a una persona y otro «en revisión» porque el Motor estaba caído se atienden de
       * formas distintas, y hasta ahora se veían igual.
       */
      cell: ({ row }) => {
        const decision = row.original.decision;
        if (!decision?.outcome) {
          return (
            <span className="text-xs text-atlas-muted">Sin veredicto</span>
          );
        }
        return (
          <div className="min-w-0">
            <StatusBadge value={decision.outcome} />
            {decision.manualReviewCaseCode ? (
              <p className="truncate font-mono text-[11px] text-atlas-muted">
                {`caso ${decision.manualReviewCaseCode}`}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "onboardingStatus",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.onboardingStatus} />,
    },
    {
      id: "actions",
      header: "Expediente",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          onClick={() => onAbrir(row.original)}
        >
          Revisar
        </Button>
      ),
    },
  ];
}
