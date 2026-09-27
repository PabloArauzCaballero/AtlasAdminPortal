"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { useLoanOfApplication } from "./hooks";
import { aceptacionDelComercio, motivoParaNoDesembolsar } from "./loan-labels";
import { EstadoCartera, Importe } from "./loan-ui";
import type { CreditApplicationSummary, LoanSummary } from "./types";

export function buildApplicationColumns(opciones: {
  puedeDesembolsar: boolean;
  onDesembolsar: (solicitud: CreditApplicationSummary) => void;
}): ColumnDef<CreditApplicationSummary>[] {
  const columnas: ColumnDef<CreditApplicationSummary>[] = [
    {
      accessorKey: "applicationCode",
      header: "Solicitud",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.applicationCode}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <EstadoCartera value={row.original.status} />,
    },
    {
      accessorKey: "requestedAmount",
      header: "Importe",
      cell: ({ row }) => (
        <Importe
          value={row.original.requestedAmount}
          currency={row.original.currencyCode}
        />
      ),
    },
    {
      accessorKey: "requestedTermMonths",
      header: "Plazo",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.requestedTermMonths} meses
        </span>
      ),
    },
    {
      accessorKey: "decidedAt",
      header: "Decidida",
      cell: ({ row }) => formatDateTime(row.original.decidedAt),
    },
    {
      accessorKey: "businessAcceptance",
      header: "Comercio",
      cell: ({ row }) => aceptacionDelComercio(row.original.businessAcceptance),
    },
  ];
  return [
    ...columnas,
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <AccionDeSolicitud
          solicitud={row.original}
          puedeDesembolsar={opciones.puedeDesembolsar}
          onDesembolsar={opciones.onDesembolsar}
        />
      ),
    },
  ];
}

/**
 * Una solicitud aprobada o ya tiene préstamo —y entonces se enlaza a él— o todavía se puede
 * desembolsar. Se pregunta a la cartera por `creditApplicationId` antes de ofrecer el botón: sin
 * eso, una solicitud ya desembolsada seguía enseñando «Desembolsar» y respondía 409.
 */
function AccionDeSolicitud({
  solicitud,
  puedeDesembolsar,
  onDesembolsar,
}: Readonly<{
  solicitud: CreditApplicationSummary;
  puedeDesembolsar: boolean;
  onDesembolsar: (solicitud: CreditApplicationSummary) => void;
}>) {
  const aprobada = solicitud.status === "approved";
  const prestamo = useLoanOfApplication(solicitud.applicationId, aprobada);
  if (!aprobada || prestamo.isLoading) return null;
  if (prestamo.data) {
    return (
      <Link
        className="whitespace-nowrap text-sm font-medium text-atlas-text underline"
        href={`/internal/operations/loans/${prestamo.data.loanId}`}
      >
        Ver préstamo {prestamo.data.loanCode}
      </Link>
    );
  }
  // Sólo se ofrece donde el servidor lo aceptaría (y si la consulta falló, no se adivina): un
  // botón que siempre responde 409 enseña a ignorar los botones.
  if (!puedeDesembolsar || prestamo.error || motivoParaNoDesembolsar(solicitud))
    return null;
  return (
    <Button
      variant="primary"
      className="h-8"
      onClick={() => onDesembolsar(solicitud)}
    >
      Desembolsar
    </Button>
  );
}

export function buildLoanColumns(
  opciones: { conCliente?: boolean; conAbrir?: boolean } = {},
): ColumnDef<LoanSummary>[] {
  const { conCliente = false, conAbrir = true } = opciones;
  const columnas: ColumnDef<LoanSummary>[] = [
    {
      accessorKey: "loanCode",
      header: "Préstamo",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.loanCode}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <EstadoCartera value={row.original.status} />,
    },
    {
      accessorKey: "principalAmount",
      header: "Capital prestado",
      cell: ({ row }) => (
        <Importe
          value={row.original.principalAmount}
          currency={row.original.currencyCode}
        />
      ),
    },
    {
      accessorKey: "outstandingPrincipal",
      header: "Capital pendiente",
      cell: ({ row }) => (
        <Importe
          value={row.original.outstandingPrincipal}
          currency={row.original.currencyCode}
        />
      ),
    },
    {
      accessorKey: "daysPastDue",
      header: "Días de atraso",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.daysPastDue}</span>
      ),
    },
    {
      id: "comercio",
      header: "Comercio",
      cell: ({ row }) => safeText(row.original.merchant?.displayName),
    },
    {
      accessorKey: "disbursedAt",
      header: "Desembolsado",
      cell: ({ row }) => formatDateTime(row.original.disbursedAt),
    },
  ];
  if (conCliente) {
    columnas.splice(1, 0, {
      accessorKey: "customerId",
      header: "Cliente",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs underline"
          href={`/internal/operations/customers/${row.original.customerId}/investigation-summary`}
        >
          #{row.original.customerId}
        </Link>
      ),
    });
  }
  if (!conAbrir) return columnas;
  return [
    ...columnas,
    {
      id: "abrir",
      header: "",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Link
          className="text-sm font-medium text-atlas-text underline"
          href={`/internal/operations/loans/${row.original.loanId}`}
        >
          Abrir
        </Link>
      ),
    },
  ];
}
