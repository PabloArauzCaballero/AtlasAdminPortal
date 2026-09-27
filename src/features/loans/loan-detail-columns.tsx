"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { estadoCartera, medioDePago } from "./loan-labels";
import { EstadoCartera, Importe } from "./loan-ui";
import type { LoanHistoryEvent, LoanInstallment, LoanPayment } from "./types";

/** Lo que falta por pagar de una cuota: capital + interés + mora, menos lo ya aplicado. */
export function pendienteDeCuota(cuota: LoanInstallment): number {
  const debido =
    Number(cuota.principalAmount) +
    Number(cuota.interestAmount) +
    Number(cuota.lateFeeAmount);
  const pagado =
    Number(cuota.paidPrincipal) +
    Number(cuota.paidInterest) +
    Number(cuota.paidLateFee);
  return Math.max(0, Math.round((debido - pagado) * 100) / 100);
}

export function buildScheduleColumns(
  currency: string,
): ColumnDef<LoanInstallment>[] {
  return [
    {
      accessorKey: "installmentNumber",
      header: "Cuota",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.installmentNumber}</span>
      ),
    },
    { accessorKey: "dueDate", header: "Vence" },
    {
      accessorKey: "principalAmount",
      header: "Capital",
      cell: ({ row }) => <Importe value={row.original.principalAmount} />,
    },
    {
      accessorKey: "interestAmount",
      header: "Interés",
      cell: ({ row }) => <Importe value={row.original.interestAmount} />,
    },
    {
      accessorKey: "lateFeeAmount",
      header: "Mora",
      cell: ({ row }) => <Importe value={row.original.lateFeeAmount} />,
    },
    {
      id: "pendiente",
      header: "Pendiente",
      cell: ({ row }) => (
        <Importe value={pendienteDeCuota(row.original)} currency={currency} />
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <EstadoCartera value={row.original.status} />,
    },
    {
      accessorKey: "daysPastDue",
      header: "Días de atraso",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.daysPastDue}</span>
      ),
    },
  ];
}

export function buildPaymentColumns(opciones: {
  puedeReversar: boolean;
  onReversar: (pago: LoanPayment) => void;
}): ColumnDef<LoanPayment>[] {
  const columnas: ColumnDef<LoanPayment>[] = [
    {
      accessorKey: "paymentCode",
      header: "Cobro",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.paymentCode}</span>
      ),
    },
    {
      accessorKey: "receivedAt",
      header: "Recibido",
      cell: ({ row }) => formatDateTime(row.original.receivedAt),
    },
    {
      accessorKey: "amount",
      header: "Importe",
      cell: ({ row }) => (
        <Importe
          value={row.original.amount}
          currency={row.original.currencyCode}
        />
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Medio",
      cell: ({ row }) => medioDePago(row.original.paymentMethod),
    },
    {
      accessorKey: "externalReference",
      header: "Referencia",
      cell: ({ row }) => safeText(row.original.externalReference),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <EstadoCartera value={row.original.status} />
          {row.original.reversalReasonCode ? (
            <span className="text-xs text-atlas-muted">
              {row.original.reversalReasonCode} ·{" "}
              {formatDateTime(row.original.reversedAt)}
            </span>
          ) : null}
        </span>
      ),
    },
  ];
  if (!opciones.puedeReversar) return columnas;
  return [
    ...columnas,
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) =>
        row.original.status === "applied" ? (
          <Button
            variant="danger"
            className="h-8"
            onClick={() => opciones.onReversar(row.original)}
          >
            Reversar
          </Button>
        ) : null,
    },
  ];
}

const EVENTOS: Record<string, string> = {
  loan_disbursed: "Desembolso",
  payment_applied: "Cobro aplicado",
  payment_reversed: "Cobro reversado",
  loan_written_off: "Castigo",
  delinquency_bucket_changed: "Cambio de tramo de mora",
};

export function buildHistoryColumns(): ColumnDef<LoanHistoryEvent>[] {
  return [
    {
      accessorKey: "happenedAt",
      header: "Cuándo",
      cell: ({ row }) => formatDateTime(row.original.happenedAt),
    },
    {
      accessorKey: "eventType",
      header: "Qué pasó",
      cell: ({ row }) =>
        EVENTOS[row.original.eventType] ?? row.original.eventType,
    },
    {
      id: "transicion",
      header: "Estado",
      cell: ({ row }) =>
        row.original.previousStatus === row.original.newStatus
          ? estadoCartera(row.original.newStatus).label
          : `${estadoCartera(row.original.previousStatus).label} → ${estadoCartera(row.original.newStatus).label}`,
    },
    {
      accessorKey: "reasonCode",
      header: "Motivo",
      cell: ({ row }) => safeText(row.original.reasonCode),
    },
    {
      accessorKey: "notes",
      header: "Notas",
      cell: ({ row }) => safeText(row.original.notes),
    },
  ];
}
