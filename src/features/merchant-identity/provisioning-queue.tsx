"use client";

import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useApproveRequestMutation, useRejectRequestMutation } from "./hooks";
import { buildRequestColumns } from "./merchant-user-columns";
import {
  CredencialEntregadaDialog,
  ProvisioningDecisionDialog,
} from "./provisioning-decision-dialog";
import type {
  MerchantProvisioningList,
  MerchantProvisioningRequest,
  MerchantProvisioningResult,
} from "./types";

/**
 * La cola de accesos que el ERP ha pedido.
 *
 * Va ARRIBA de las identidades ya concedidas a propósito: es el trabajo pendiente, y ponerla debajo
 * de una tabla paginada de consulta la escondía tras el desplazamiento en cuanto hubiera una
 * veintena de identidades.
 *
 * La consulta se recibe por props en vez de pedirla aquí porque la cabecera de la pantalla cuenta
 * las pendientes: con dos consultas separadas, el contador y la tabla podían enseñar cifras
 * distintas durante un refresco.
 */
export function ProvisioningQueue({
  query,
}: Readonly<{ query: UseQueryResult<MerchantProvisioningList> }>) {
  const [decision, setDecision] = useState<{
    peticion: MerchantProvisioningRequest;
    accion: "aprobar" | "rechazar";
  } | null>(null);
  const [entregada, setEntregada] = useState<MerchantProvisioningResult | null>(
    null,
  );

  const aprobar = useApproveRequestMutation();
  const rechazar = useRejectRequestMutation();

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const columns = useMemo(
    () =>
      buildRequestColumns((peticion, accion) =>
        setDecision({ peticion, accion }),
      ),
    [],
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
          emptyTitle="No hay accesos pedidos."
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
            // La contraseña se enseña en un segundo diálogo y no en un aviso que se desvanece:
            // sólo viaja una vez, y un mensaje que se va solo la pierde sin remedio.
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
