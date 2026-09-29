"use client";

import { useMemo, useState } from "react";
import { AlarmClock, HandCoins, Hourglass, ListChecks, X } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { PAYMENT_CLAIMS_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { buildPaymentClaimColumns } from "./claims-columns";
import { usePaymentClaims } from "./hooks";
import {
  PAYMENT_CLAIM_AGE_OPTIONS,
  PAYMENT_CLAIM_STATUS_OPTIONS,
} from "./labels";
import type { PaymentClaimsFilters } from "./types";

const SIN_FILTROS: PaymentClaimsFilters = {
  status: "",
  partnerId: "",
  q: "",
  olderThanHours: "",
  page: 1,
};

/**
 * Avisos de pago: la cola que antes no veía nadie de dentro (hallazgo B4).
 *
 * Sólo observa. Quien confirma o rechaza un aviso es el comercio, desde el ERP, porque es quien ve
 * el dinero entrar en su cuenta; si también se pudiera aquí habría dos sitios desde los que dar por
 * pagada una cuota. Lo que esta pantalla añade es ver la cola de TODOS los comercios, con lo que
 * lleva más de 48 h esperando arriba y en rojo, para llamar al comercio que se está durmiendo.
 */
export function PaymentClaimsPage() {
  return (
    <RoleGate roles={PAYMENT_CLAIMS_ROLE_LIST}>
      <AuthorizedPaymentClaimsPage />
    </RoleGate>
  );
}

function AuthorizedPaymentClaimsPage() {
  const [filters, setFilters] = useState<PaymentClaimsFilters>(SIN_FILTROS);
  const claims = usePaymentClaims(filters);
  const columns = useMemo(
    () =>
      buildPaymentClaimColumns((partnerId) =>
        setFilters((actual) => ({ ...actual, partnerId, page: 1 })),
      ),
    [],
  );

  const cambiar = (patch: Partial<PaymentClaimsFilters>) =>
    setFilters((actual) => ({ ...actual, ...patch, page: 1 }));
  const summary = claims.data?.summary;

  return (
    <>
      <PageHeader
        icon={HandCoins}
        eyebrow="Operación de cartera"
        title="Avisos de pago"
        description="Los comprobantes que los clientes enviaron al pagar una cuota y que el comercio tiene que verificar. Aquí sólo se supervisan: confirmar o rechazar lo hace el comercio desde el ERP."
      />
      {summary ? (
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            icon={Hourglass}
            label="Pendientes en la cola"
            value={formatNumber(summary.pending)}
            hint="Toda la cola de la organización, sin filtros."
          />
          <MetricCard
            icon={AlarmClock}
            label={`Atrasados (más de ${summary.staleAfterHours} h)`}
            value={formatNumber(summary.stalePending)}
            tone={summary.stalePending > 0 ? "critical" : "success"}
            hint="Pendientes que el comercio no ha mirado a tiempo."
          />
          <MetricCard
            icon={ListChecks}
            label="En esta consulta"
            value={formatNumber(claims.data?.meta.total ?? 0)}
          />
        </section>
      ) : null}
      <FilterBar
        search={filters.q}
        searchPlaceholder="Código de aviso, de cliente o comercio…"
        searchTooltip="Busca por parte del código del aviso, del código del cliente (CUS-…) o del nombre comercial o legal del comercio, sin distinguir mayúsculas."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: filters.status,
            options: PAYMENT_CLAIM_STATUS_OPTIONS,
            tooltip:
              "En qué punto está el aviso: esperando al comercio, confirmado o rechazado.",
          },
          {
            name: "olderThanHours",
            label: "Antigüedad",
            value: filters.olderThanHours,
            options: PAYMENT_CLAIM_AGE_OPTIONS,
            tooltip:
              "Deja sólo los avisos enviados hace más de ese tiempo, para encontrar lo que lleva demasiado esperando.",
          },
        ]}
        onSearchChange={(q) => cambiar({ q })}
        onFilterChange={(name, value) => cambiar({ [name]: value })}
        onClear={() => setFilters(SIN_FILTROS)}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            cambiar({ status: "pending_verification", olderThanHours: "48" })
          }
        >
          <AlarmClock className="h-4 w-4" aria-hidden />
          Ver sólo los atrasados
        </Button>
        {filters.partnerId ? (
          <Button
            aria-label={`Quitar el filtro del comercio #${filters.partnerId}`}
            onClick={() => cambiar({ partnerId: "" })}
          >
            Comercio #{filters.partnerId}
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {claims.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {claims.error ? (
        <ErrorState
          description={
            isAtlasApiError(claims.error)
              ? claims.error.message
              : "No se pudo cargar la cola de avisos de pago."
          }
          requestId={
            isAtlasApiError(claims.error) ? claims.error.requestId : undefined
          }
          onRetry={() => void claims.refetch()}
        />
      ) : null}
      {claims.data ? (
        <Card>
          <CardHeader>
            <SectionHeader
              title="Cola de avisos"
              description="Los pendientes salen primero y el más antiguo arriba. Pulsa un comercio para ver sólo los suyos."
              className="mb-0"
            />
          </CardHeader>
          <CardContent>
            <DataTable
              data={claims.data.items}
              columns={columns}
              meta={claims.data.meta}
              onPageChange={(page) =>
                setFilters((actual) => ({ ...actual, page }))
              }
              emptyTitle="No hay avisos de pago para estos filtros."
              emptyDescription="Cuando un cliente envíe un comprobante al pagar una cuota, aparecerá aquí hasta que su comercio lo verifique."
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
