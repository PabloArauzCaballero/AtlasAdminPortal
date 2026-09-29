"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CarteraError } from "@/features/loans/cartera-error";
import { useRatingScale } from "@/features/loans/hooks";
import { formatRate } from "@/features/loans/loan-ui";
import type { RatingScaleGrade } from "@/features/loans/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Card } from "@/shared/components/ui/card";
import { LoadingSkeleton } from "@/shared/components/ui/states";

/**
 * La escala de calificación vigente: categorías, días de atraso y previsión.
 *
 * Vivía como tarjeta en «Préstamos» y se repetía allí la pregunta que responde esta pantalla
 * (auditoría 2026-09-29, 02·#15). Se muda aquí, junto a la cartera por categoría que califica.
 */
const COLUMNAS_ESCALA: ColumnDef<RatingScaleGrade>[] = [
  {
    accessorKey: "grade",
    header: "Categoría",
    cell: ({ row }) => (
      <Badge tone={row.original.tone}>{row.original.grade}</Badge>
    ),
  },
  { accessorKey: "label", header: "Significado" },
  {
    id: "mora",
    header: "Días de atraso",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.maxDaysPastDue === null
          ? `${row.original.minDaysPastDue} o más`
          : `${row.original.minDaysPastDue} – ${row.original.maxDaysPastDue}`}
      </span>
    ),
  },
  {
    accessorKey: "provisionRate",
    header: "Previsión",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatRate(row.original.provisionRate)}
      </span>
    ),
  },
  { accessorKey: "help", header: "Cómo se lee" },
];

export function RatingScaleCard() {
  const escala = useRatingScale();
  const grades = useMemo(() => escala.data?.grades ?? [], [escala.data]);
  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        Escala de calificación vigente
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        {escala.data
          ? `Política ${escala.data.policyCode} ${escala.data.versionCode}. `
          : null}
        Es regulatoria y versionada: se lee del servidor, nunca se copia aquí.
      </p>
      {escala.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {escala.error ? (
        <CarteraError
          error={escala.error}
          generico="No hay política de calificación activa: sin ella no se califica ninguna deuda."
          onRetry={() => void escala.refetch()}
        />
      ) : null}
      {escala.data ? (
        <DataTable
          data={grades}
          columns={COLUMNAS_ESCALA}
          emptyTitle="La política vigente no tiene categorías."
          emptyDescription="Revisa la política de calificación activa."
        />
      ) : null}
    </Card>
  );
}
