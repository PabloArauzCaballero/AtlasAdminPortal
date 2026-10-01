"use client";

import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useApproveRequestMutation,
  useProvisioningRequests,
  useRejectRequestMutation,
} from "./hooks";
import { PROVISIONING_STATUS_OPTIONS, paginationOf } from "./labels";
import { buildRequestColumns } from "./merchant-user-columns";
import {
  CredencialEntregadaDialog,
  ProvisioningDecisionDialog,
} from "./provisioning-decision-dialog";
import type {
  MerchantProvisioningRequest,
  MerchantProvisioningResult,
} from "./types";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 10;

/**
 * La cola de accesos que el ERP ha pedido.
 *
 * Va ARRIBA de las identidades ya concedidas a propósito: es el trabajo pendiente, y ponerla debajo
 * de una tabla paginada de consulta la escondía tras el desplazamiento en cuanto hubiera una
 * veintena de identidades.
 *
 * Paginada en el servidor y filtrada por estado —por defecto, las PENDIENTES—, con buscador por
 * correo, nombre, cuenta o sucursal. Antes traía las 50 primeras mezclando pendientes y resueltas
 * sin pie de página: la número 51 no se podía atender desde aquí. Para ver en qué quedó una
 * petición ya resuelta se elige su estado en el filtro.
 *
 * El contador «Por atender» de la cabecera no sale de esta tabla: lo pide aparte, filtrado por
 * estado, y las dos consultas cuelgan de la misma clave, así que decidir invalida ambas a la vez.
 */
export function ProvisioningQueue() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const query = useProvisioningRequests({
    page,
    limit: usePageSize(POR_PAGINA),
    ...(status ? { status } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const [decision, setDecision] = useState<{
    peticion: MerchantProvisioningRequest;
    accion: "aprobar" | "rechazar";
  } | null>(null);
  const [entregada, setEntregada] = useState<MerchantProvisioningResult | null>(
    null,
  );

  const aprobar = useApproveRequestMutation();
  const rechazar = useRejectRequestMutation();
  const { hasPermission } = useAuth();
  const puedeDecidir = hasPermission("merchant.users.manage");

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const columns = useMemo(
    () =>
      buildRequestColumns(
        (peticion, accion) => setDecision({ peticion, accion }),
        puedeDecidir,
      ),
    [puedeDecidir],
  );

  const errorDeDecision = aprobar.error ?? rechazar.error;

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        Accesos pedidos por el ERP
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        Cada fila es una persona que el ERP registró en el CRM de un comercio y
        para la que pidió acceso. Conceder crea su identidad con estos mismos
        datos; rechazar devuelve el motivo al ERP.
      </p>

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por correo, nombre, cuenta o sucursal…"
        searchTooltip="Busca en el servidor, en todas las peticiones: coincide con parte del correo, del nombre de la persona, del nombre de la cuenta B2B o de la sucursal."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: PROVISIONING_STATUS_OPTIONS,
            allLabel: "Todas las peticiones",
            tooltip:
              "Por defecto, las pendientes: lo que falta por atender. Elige otro estado para ver en qué quedó una petición.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "status") setStatus(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("pending");
          setPage(1);
        }}
      />
      {query.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar la cola de accesos pedidos."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <DataTable
          data={items}
          columns={columns}
          meta={paginationOf(query.data)}
          onPageChange={setPage}
          emptyTitle={
            status === "pending"
              ? "No hay accesos pendientes."
              : "Ninguna petición coincide con estos filtros."
          }
          emptyDescription="Cuando el ERP registre a alguien en el CRM de un comercio, su petición aparecerá aquí."
        />
      ) : null}

      {decision ? (
        <ProvisioningDecisionDialog
          peticion={decision.peticion}
          accion={decision.accion}
          isPending={aprobar.isPending || rechazar.isPending}
          error={
            errorDeDecision
              ? isAtlasApiError(errorDeDecision)
                ? errorDeDecision.message
                : "No se pudo registrar la decisión."
              : null
          }
          onClose={() => setDecision(null)}
          onAprobar={async (userCode) => {
            const resultado = await aprobar.mutateAsync({
              requestId: decision.peticion.id,
              ...(userCode ? { userCode } : {}),
            });
            setDecision(null);
            // Un segundo diálogo, y no un aviso que se desvanece: explica que la contraseña
            // viajó por correo y qué verá la persona al entrar (cambio obligatorio y código).
            setEntregada(resultado);
          }}
          onRechazar={async (motivo) => {
            await rechazar.mutateAsync({
              requestId: decision.peticion.id,
              reason: motivo,
            });
            setDecision(null);
          }}
        />
      ) : null}

      {entregada ? (
        <CredencialEntregadaDialog
          resultado={entregada}
          onClose={() => setEntregada(null)}
        />
      ) : null}
    </Card>
  );
}
