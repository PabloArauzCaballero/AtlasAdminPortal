"use client";

import { motivoDeCartera } from "./loan-forms";
import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { CarteraError } from "./cartera-error";
import {
  useCustomerRating,
  useCustomerRatingHistory,
  useLoanRating,
  useLoanRatingHistory,
} from "./hooks";
import { tramoDeMora } from "./loan-labels";
import { Importe, formatRate } from "./loan-ui";
import type { CustomerRating, LoanRating } from "./types";

/**
 * La calificación es un juicio con consecuencia contable: categoría, días de atraso que la
 * fijaron, exposición y previsión. Es de roles internos y NO se enseña al cliente por esta vía.
 *
 * «Sin calificar» se pinta como vacío y no como «A»: son estados distintos, y confundirlos haría
 * pasar por sano un crédito que el barrido nunca alcanzó.
 */

type Historico = Pick<
  CustomerRating | LoanRating,
  "id" | "grade" | "gradeLabel" | "previousGrade" | "ratingReason" | "ratedAt"
>;

const COLUMNAS_HISTORIAL: ColumnDef<Historico>[] = [
  {
    accessorKey: "ratedAt",
    header: "Fecha",
    cell: ({ row }) => formatDateTime(row.original.ratedAt),
  },
  {
    accessorKey: "grade",
    header: "Categoría",
    cell: ({ row }) => (
      <span>
        <Badge tone="info">{row.original.grade}</Badge>{" "}
        {row.original.gradeLabel}
      </span>
    ),
  },
  {
    accessorKey: "previousGrade",
    header: "Venía de",
    cell: ({ row }) => safeText(row.original.previousGrade),
  },
  {
    accessorKey: "ratingReason",
    header: "Motivo",
    cell: ({ row }) => motivoDeCartera(row.original.ratingReason),
  },
];

function Cabecera({
  titulo,
  grade,
  gradeLabel,
}: Readonly<{ titulo: string; grade?: string; gradeLabel?: string }>) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="text-base font-semibold text-atlas-text">{titulo}</h2>
      {grade ? (
        <Badge tone="info">
          {grade} · {gradeLabel}
        </Badge>
      ) : null}
    </div>
  );
}

export function CustomerRatingCard({
  customerId,
}: Readonly<{ customerId: string }>) {
  const rating = useCustomerRating(customerId);
  const [verHistorial, setVerHistorial] = useState(false);
  const historial = useCustomerRatingHistory(customerId, verHistorial);
  const data = rating.data;

  return (
    <Card className="p-5">
      <Cabecera
        titulo="Categoría de riesgo del cliente (por mora)"
        grade={data?.grade}
        gradeLabel={data?.gradeLabel}
      />
      {rating.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {rating.error ? (
        <CarteraError
          error={rating.error}
          generico="No se pudo leer la calificación del cliente."
          onRetry={() => void rating.refetch()}
        />
      ) : null}
      {data === null ? (
        <EmptyState
          title="Todavía sin calificar."
          description="El cliente no tiene deuda viva calificada. El barrido de calificación lo alcanzará cuando tenga un préstamo vigente."
        />
      ) : null}
      {data ? (
        <div className="space-y-3">
          <KeyValueGrid
            items={[
              { label: "Peor atraso", value: `${data.worstDaysPastDue} días` },
              { label: "Préstamos calificados", value: data.ratedLoanCount },
              {
                label: "Exposición total",
                value: <Importe value={data.totalExposureAmount} />,
              },
              {
                label: "Previsión total",
                value: <Importe value={data.totalProvisionAmount} />,
              },
              {
                label: "Préstamo que fija la categoría",
                value: data.drivingLoanId ? (
                  <Link
                    className="underline"
                    href={`/internal/operations/loans/${data.drivingLoanId}`}
                  >
                    #{data.drivingLoanId}
                  </Link>
                ) : (
                  "—"
                ),
              },
              { label: "Calificado", value: formatDateTime(data.ratedAt) },
            ]}
          />
          <Button
            variant="ghost"
            aria-expanded={verHistorial}
            onClick={() => setVerHistorial((v) => !v)}
          >
            {verHistorial ? "Ocultar historial" : "Ver cómo migró de categoría"}
          </Button>
          {verHistorial && historial.isLoading ? (
            <LoadingSkeleton rows={2} />
          ) : null}
          {verHistorial && historial.data ? (
            <DataTable
              data={historial.data.items}
              columns={COLUMNAS_HISTORIAL}
              emptyTitle="Sin cortes anteriores."
              emptyDescription="Ésta es la primera calificación del cliente."
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function LoanRatingCard({ loanId }: Readonly<{ loanId: string }>) {
  const rating = useLoanRating(loanId);
  const historial = useLoanRatingHistory(loanId);
  const data = rating.data;

  return (
    <Card className="p-5">
      <Cabecera
        titulo="Calificación del préstamo"
        grade={data?.grade}
        gradeLabel={data?.gradeLabel}
      />
      {rating.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {rating.error ? (
        <CarteraError
          error={rating.error}
          generico="No se pudo leer la calificación del préstamo."
          onRetry={() => void rating.refetch()}
        />
      ) : null}
      {data === null ? (
        <EmptyState
          title="Todavía sin calificar."
          description="El barrido de calificación aún no alcanzó este préstamo. Puedes adelantarlo desde «Calificación de cartera»."
        />
      ) : null}
      {data ? (
        <KeyValueGrid
          items={[
            { label: "Días de atraso", value: data.daysPastDue },
            {
              label: "Tramo de mora",
              value: tramoDeMora(data.delinquencyBucket),
            },
            {
              label: "Exposición",
              value: <Importe value={data.exposureAmount} />,
            },
            {
              label: "Tasa de previsión",
              value: formatRate(data.provisionRate),
            },
            {
              label: "Previsión",
              value: <Importe value={data.provisionAmount} />,
            },
            { label: "Calificado", value: formatDateTime(data.ratedAt) },
          ]}
        />
      ) : null}
      <h3 className="mb-2 mt-4 text-sm font-medium text-atlas-text">
        Curva de deterioro
      </h3>
      {historial.error ? (
        <CarteraError
          error={historial.error}
          generico="No se pudo leer el historial de calificaciones."
          onRetry={() => void historial.refetch()}
        />
      ) : (
        <DataTable
          data={historial.data?.items ?? []}
          columns={COLUMNAS_HISTORIAL}
          emptyTitle="Sin recalificaciones."
          emptyDescription="Cada vez que el préstamo cambie de categoría aparecerá aquí, con la anterior."
        />
      )}
    </Card>
  );
}
