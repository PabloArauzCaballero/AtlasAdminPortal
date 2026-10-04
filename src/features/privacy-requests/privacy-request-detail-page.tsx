"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { usePrivacyRequest, usePrivacyTransitionMutation } from "./hooks";
import { TRANSITION_COPY, typeLabel } from "./labels";
import { DuePill, PrivacyStatusBadge } from "./privacy-request-badges";
import { PrivacyRequestContent } from "./privacy-request-content";
import { PrivacyRequestHistory } from "./privacy-request-history";
import {
  PRIVACY_MANAGE_PERMISSION,
  PRIVACY_READ_PERMISSION,
} from "./privacy-requests-page";
import { PrivacyTransitionDialog } from "./transition-dialog";
import type { PrivacyRequestDetail, PrivacyTransitionTarget } from "./types";

export function PrivacyRequestDetailPage({
  requestId,
}: Readonly<{ requestId: string }>) {
  return (
    <PermissionGate permissions={[PRIVACY_READ_PERMISSION]}>
      <AuthorizedDetail requestId={requestId} />
    </PermissionGate>
  );
}

function AuthorizedDetail({ requestId }: Readonly<{ requestId: string }>) {
  const detalle = usePrivacyRequest(requestId);
  const mover = usePrivacyTransitionMutation();
  const { hasPermission } = useAuth();
  const [destino, setDestino] = useState<PrivacyTransitionTarget | null>(null);
  const solicitud = detalle.data;

  return (
    <>
      <Link
        href="/internal/governance/privacy-requests"
        className="mb-3 inline-flex items-center gap-1 text-sm text-atlas-muted hover:text-atlas-text"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la cola
      </Link>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Solicitudes de privacidad"
        title={solicitud ? typeLabel(solicitud.requestType) : "Solicitud"}
        description={solicitud?.requestCode ?? `Solicitud ${requestId}`}
      />
      {detalle.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {detalle.error ? (
        <ErrorState
          description={
            isAtlasApiError(detalle.error)
              ? detalle.error.status === 404
                ? "Esta solicitud no existe en esta organización."
                : detalle.error.message
              : "No se pudo cargar la solicitud."
          }
          requestId={
            isAtlasApiError(detalle.error) ? detalle.error.requestId : undefined
          }
          onRetry={() => void detalle.refetch()}
        />
      ) : null}
      {solicitud ? (
        <div className="space-y-6">
          <Acciones
            solicitud={solicitud}
            puedeGestionar={hasPermission(PRIVACY_MANAGE_PERMISSION)}
            onElegir={(target) => {
              mover.reset();
              setDestino(target);
            }}
          />
          <KeyValueSection
            title="La solicitud"
            description="Lo que pidió el cliente, cuándo y hasta cuándo hay para atenderlo."
            items={[
              {
                label: "Estado",
                value: <PrivacyStatusBadge status={solicitud.status} />,
              },
              { label: "Derecho", value: typeLabel(solicitud.requestType) },
              {
                label: "Código",
                value: safeText(solicitud.requestCode),
                mono: true,
              },
              {
                label: "Cliente",
                value: `${solicitud.customerName ?? "Sin nombre registrado"} · ${safeText(solicitud.customerCode ?? solicitud.customerId)}`,
              },
              {
                label: "Recibida",
                value: formatDateTime(solicitud.receivedAt),
              },
              {
                label: "Vence",
                value: (
                  <span className="inline-flex items-center gap-2">
                    {formatDateTime(solicitud.dueAt)}
                    <DuePill request={solicitud} />
                  </span>
                ),
              },
              {
                label: "Responsable",
                value: solicitud.handledByName ?? "Sin asignar",
              },
              { label: "Cerrada", value: formatDateTime(solicitud.resolvedAt) },
              {
                label: "Cómo se resolvió",
                value: solicitud.resolutionNotes ?? "—",
              },
            ]}
          />
          <PrivacyRequestContent solicitud={solicitud} />
          <PrivacyRequestHistory history={solicitud.history} />
        </div>
      ) : null}
      {solicitud && destino ? (
        <PrivacyTransitionDialog
          key={destino}
          requestCode={solicitud.requestCode ?? solicitud.requestId}
          target={destino}
          isPending={mover.isPending}
          error={mover.error}
          onCancel={() => setDestino(null)}
          onConfirm={(reason) =>
            mover.mutate(
              { requestId: solicitud.requestId, toStatus: destino, reason },
              { onSuccess: () => setDestino(null) },
            )
          }
        />
      ) : null}
    </>
  );
}

/**
 * Los botones salen de `allowedTransitions`, que da el backend: la pantalla no decide qué salto es
 * válido. Sin `privacy.requests.manage` se explica quién puede, en vez de ofrecer un botón que
 * respondería 403.
 */
function Acciones({
  solicitud,
  puedeGestionar,
  onElegir,
}: Readonly<{
  solicitud: PrivacyRequestDetail;
  puedeGestionar: boolean;
  onElegir: (target: PrivacyTransitionTarget) => void;
}>) {
  const destinos = solicitud.allowedTransitions.filter(
    (t): t is PrivacyTransitionTarget => t !== "received",
  );
  if (destinos.length === 0) return null;
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-atlas-muted">
        {puedeGestionar
          ? "Siguiente paso de la atención:"
          : "Moverla de estado lo hace la jefatura de cumplimiento (permiso privacy.requests.manage)."}
      </p>
      {puedeGestionar ? (
        <div className="flex gap-2">
          {destinos.map((target) => (
            <Button
              key={target}
              variant={target === "rejected" ? "danger" : "primary"}
              onClick={() => onElegir(target)}
            >
              {TRANSITION_COPY[target].action}
            </Button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
