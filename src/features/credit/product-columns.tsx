"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatAmount, formatDateTime, safeText } from "@/shared/lib/format";
import { ProductStatusBadge } from "./credit-badges";
import type { CreditProduct, CreditProductStatus } from "./types";

/** Las transiciones que se ofrecen desde cada estado; el backend admite cualquiera de las cuatro. */
const NEXT_STATUSES: Record<string, CreditProductStatus[]> = {
  draft: ["active", "retired"],
  active: ["suspended", "retired"],
  suspended: ["active", "retired"],
  retired: [],
};

const ACTION_LABEL: Record<CreditProductStatus, string> = {
  draft: "Volver a borrador",
  active: "Activar",
  suspended: "Suspender",
  retired: "Retirar",
};

export function nextStatusesFor(status: string): CreditProductStatus[] {
  return NEXT_STATUSES[status] ?? [];
}

export function buildProductColumns(
  onChangeStatus: (product: CreditProduct, to: CreditProductStatus) => void,
): ColumnDef<CreditProduct>[] {
  return [
    {
      header: "Producto",
      accessorKey: "productName",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-atlas-text">
            {row.original.productName}
          </p>
          <p className="font-mono text-[0.6875rem] text-atlas-muted">
            {row.original.productCode}
          </p>
        </div>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <ProductStatusBadge value={row.original.status} />,
    },
    {
      header: "Monto",
      id: "amount",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatAmount(row.original.minAmount)} –{" "}
          {formatAmount(row.original.maxAmount)} {row.original.currencyCode}
        </span>
      ),
    },
    {
      header: "Plazo",
      id: "term",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.minTermMonths}–{row.original.maxTermMonths} meses
        </span>
      ),
    },
    {
      header: "Tasa anual",
      accessorKey: "annualInterestRate",
      cell: ({ row }) =>
        row.original.annualInterestRate === null ? (
          <span className="text-atlas-muted">La fija el motor</span>
        ) : (
          <span className="tabular-nums">
            {safeText(Number(row.original.annualInterestRate))} %
          </span>
        ),
    },
    {
      header: "Revisión",
      accessorKey: "requiresManualReview",
      cell: ({ row }) =>
        row.original.requiresManualReview ? (
          <Badge tone="warning">Siempre humana</Badge>
        ) : (
          <Badge tone="muted">Según el motor</Badge>
        ),
    },
    {
      header: "Vigencia",
      id: "validity",
      cell: ({ row }) => (
        <span className="text-xs text-atlas-muted">
          {row.original.effectiveFrom
            ? formatDateTime(row.original.effectiveFrom)
            : "Sin inicio"}{" "}
          →{" "}
          {row.original.effectiveUntil
            ? formatDateTime(row.original.effectiveUntil)
            : "sin fin"}
        </span>
      ),
    },
    {
      header: "Acciones",
      id: "actions",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          {nextStatusesFor(row.original.status).map((to) => (
            <Button
              key={to}
              className="h-8 px-2 text-xs"
              variant={to === "retired" ? "danger" : "secondary"}
              onClick={() => onChangeStatus(row.original, to)}
            >
              {ACTION_LABEL[to]}
            </Button>
          ))}
        </div>
      ),
    },
  ];
}
