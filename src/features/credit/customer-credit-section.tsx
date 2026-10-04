"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Landmark } from "lucide-react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useAuth } from "@/shared/auth/auth-context";
import { CREDIT_OPERATIONS_ROLE_LIST } from "@/shared/auth/portal-roles";
import { formatAmount, formatDateTime } from "@/shared/lib/format";
import { AcceptanceBadge, ApplicationStatusBadge } from "./credit-badges";
import { creditErrorMessage } from "./credit-rules";
import { CustomerCardTierPanel } from "./card-tier-panel";
import { CustomerCreditLine } from "./customer-credit-line";
import { useCustomerCreditApplications } from "./hooks";
import type { CustomerCreditApplication } from "./types";

export function applicationHref(applicationId: string): string {
  return `/internal/operations/credit/applications/${applicationId}`;
}

export function buildCustomerApplicationColumns(): ColumnDef<CustomerCreditApplication>[] {
  return [
    {
      header: "Solicitud",
      accessorKey: "applicationCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.applicationCode}
        </span>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <ApplicationStatusBadge value={row.original.status} />,
    },
    {
      header: "Monto",
      accessorKey: "requestedAmount",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatAmount(row.original.requestedAmount)}{" "}
          {row.original.currencyCode}
        </span>
      ),
    },
    {
      header: "Plazo",
      accessorKey: "requestedTermMonths",
      cell: ({ row }) => `${row.original.requestedTermMonths} meses`,
    },
    {
      header: "Enviada",
      accessorKey: "submittedAt",
      cell: ({ row }) => formatDateTime(row.original.submittedAt),
    },
    {
      header: "Negocio",
      accessorKey: "businessAcceptance",
      cell: ({ row }) => (
        <AcceptanceBadge value={row.original.businessAcceptance} />
      ),
    },
    {
      header: "Acción",
      id: "open",
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Link
          href={applicationHref(row.original.applicationId)}
          className="inline-flex h-8 items-center rounded-md border border-atlas-border px-2 text-xs text-atlas-text hover:bg-atlas-soft"
        >
          Abrir y decidir
        </Link>
      ),
    },
  ];
}

/**
 * El crédito del cliente en su ficha: la línea vigente, el recálculo y sus solicitudes.
 *
 * Sólo para los roles que el backend deja entrar en `operations/credit` y en las lecturas de
 * crédito del cliente; a los demás roles internos (cumplimiento, auditoría) el backend les
 * respondería 403, así que se les dice en vez de pintarles un error.
 */
export function CustomerCreditSection({
  customerId,
}: Readonly<{ customerId: string }>) {
  const { hasAnyRole } = useAuth();
  const allowed = hasAnyRole(CREDIT_OPERATIONS_ROLE_LIST);

  return (
    <Card testId="credito-del-cliente">
      <CardHeader>
        <SectionHeader
          icon={Landmark}
          title="Crédito"
          description="Cuánto puede gastar el cliente y por qué, y sus solicitudes. Cada solicitud se abre para decidirla."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {allowed ? (
          <div className="space-y-6">
            <CustomerCreditLine customerId={customerId} canOperate />
            <CustomerCardTierPanel customerId={customerId} />
            <CustomerApplications customerId={customerId} />
          </div>
        ) : (
          <p className="text-sm text-atlas-muted">
            Tu rol no ve el crédito de los clientes. Lo ven operaciones y
            analistas de riesgo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerApplications({
  customerId,
}: Readonly<{ customerId: string }>) {
  const list = useCustomerCreditApplications(customerId);
  const columns = useMemo(() => buildCustomerApplicationColumns(), []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-atlas-text">Solicitudes</h3>
      {list.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {list.error ? (
        <ErrorState
          description={creditErrorMessage(
            list.error,
            "No se pudieron cargar las solicitudes del cliente.",
          )}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data ? (
        <DataTable
          data={list.data.applications}
          columns={columns}
          emptyTitle="El cliente no ha pedido ningún crédito."
          emptyDescription="Las solicitudes aparecen aquí en cuanto el cliente pide un crédito desde la app."
        />
      ) : null}
    </div>
  );
}
