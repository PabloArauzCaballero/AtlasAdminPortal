"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatAmount, formatDateTime } from "@/shared/lib/format";
import { formatAgeHours, paymentClaimStatusLabel } from "./labels";
import type { SupervisedPaymentClaim } from "./types";

const TONO_ESTADO = {
  pending_verification: "warning",
  verified: "success",
  rejected: "critical",
} as const;

const enlace = "font-semibold text-atlas-accent underline";

export function loanHref(loanId: string): string {
  return `/internal/operations/loans/${encodeURIComponent(loanId)}`;
}

export function customerHref(customerId: string): string {
  return `/internal/operations/customers/${encodeURIComponent(customerId)}/investigation-summary`;
}

/**
 * `onFilterPartner` convierte el nombre del comercio en filtro: la pregunta que sigue a «este aviso
 * lleva tres días» es «¿y qué más tiene ese comercio sin mirar?».
 */
export function buildPaymentClaimColumns(
  onFilterPartner: (partnerId: string) => void,
): ColumnDef<SupervisedPaymentClaim>[] {
  return [
    {
      header: "Aviso",
      accessorKey: "claimCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {row.original.claimCode}
        </span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge
          tone={
            TONO_ESTADO[row.original.status as keyof typeof TONO_ESTADO] ??
            "default"
          }
          dot
        >
          {paymentClaimStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      header: "Espera",
      accessorKey: "ageHours",
      cell: ({ row }) =>
        row.original.stale ? (
          <Badge tone="critical">
            {formatAgeHours(row.original.ageHours)} · atrasado
          </Badge>
        ) : (
          <span className="tabular-nums">
            {formatAgeHours(row.original.ageHours)}
          </span>
        ),
    },
    {
      header: "Importe",
      accessorKey: "claimedAmount",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatAmount(row.original.claimedAmount)} {row.original.currencyCode}
        </span>
      ),
    },
    {
      header: "Comercio",
      accessorKey: "partnerName",
      cell: ({ row }) => {
        const { partnerId, partnerName } = row.original;
        if (!partnerId) return "—";
        return (
          <button
            type="button"
            className={enlace}
            title="Ver sólo los avisos de este comercio"
            onClick={() => onFilterPartner(partnerId)}
          >
            {partnerName ?? `#${partnerId}`}
          </button>
        );
      },
    },
    {
      header: "Cliente",
      accessorKey: "customerName",
      cell: ({ row }) => (
        <Link className={enlace} href={customerHref(row.original.customerId)}>
          {row.original.customerName ??
            row.original.customerCode ??
            `#${row.original.customerId}`}
        </Link>
      ),
    },
    {
      header: "Préstamo",
      accessorKey: "loanCode",
      cell: ({ row }) => (
        <Link className={enlace} href={loanHref(row.original.loanId)}>
          {row.original.loanCode ?? `#${row.original.loanId}`}
          {row.original.installmentNumber
            ? ` · cuota ${row.original.installmentNumber}`
            : ""}
        </Link>
      ),
    },
    {
      header: "Enviado",
      accessorKey: "submittedAt",
      cell: ({ row }) => formatDateTime(row.original.submittedAt),
    },
    {
      header: "Decidido",
      accessorKey: "decidedAt",
      cell: ({ row }) =>
        row.original.decidedAt ? (
          <span title={row.original.rejectionReason ?? undefined}>
            {formatDateTime(row.original.decidedAt)}
            {row.original.rejectionReason ? (
              <span className="block text-xs text-atlas-muted">
                {row.original.rejectionReason}
              </span>
            ) : null}
          </span>
        ) : (
          "—"
        ),
    },
  ];
}
