"use client";

import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import {
  useDecidePartnerMutation,
  usePartnerStatus,
  useRequestKybReviewMutation,
} from "./hooks";
import { onboardingStatusLabel, partnerActionErrorMessage } from "./labels";
import { PartnerDecisionProvenanceCard } from "./partner-decision-provenance";
import { PartnerFolderLink } from "./partner-folder-link";
import { PedirVerificacion } from "./partner-kyb-request";
import { PartnerNetworkLists } from "./partner-network-lists";
import type { PartnerDecisionProvenance, PartnerQueueItem } from "./types";

/**
 * El expediente de un comercio, abierto desde la cola para decidirlo.
 *
 * Se pide el expediente COMPLETO al abrir y no se aprovecha la fila de la cola: la cola trae lo
 * justo para elegir a quién atender, y firmar una verificación con cuatro campos resumidos sería
 * firmar sin haber mirado. Sucursales, QR y terminales se enseñan como listas; los DOCUMENTOS no
 * vienen en esta lectura (`/status` trae perfil, requisitos pendientes, sucursales, QR y
 * terminales), así que se enlaza a la carpeta del comercio en Archivos. El volcado técnico va al
 * final, plegado, y ya no se titula «Expediente completo»: no lo es.
 *
 * La comisión (MDR) se enseña, no se edita: se negocia y se lleva en el ERP.
 *
 * ## Y la decisión, salvo degradación, tampoco se toma aquí
 *
 * La verificación la resuelve el Motor con `PARTNER_KYB_REVIEW` al enviarse el expediente. Cuando
 * su desenlace exige criterio humano abre SU caso, y este cajón enseña cuál y enlaza a él: dos
 * bandejas para el mismo expediente producen dos veredictos y gana el que alguien mire primero.
 * El formulario de aprobar/rechazar sólo aparece cuando no hay caso —una decisión automática del
 * Motor, o el Motor caído al enviar—, que es la degradación para la que existe.
 */
export function PartnerFileDrawer({
  expediente,
  onClose,
}: Readonly<{ expediente: PartnerQueueItem; onClose: () => void }>) {
  const [motivo, setMotivo] = useState("");
  const [pendiente, setPendiente] = useState<"aprobar" | "rechazar" | null>(
    null,
  );

  const estado = usePartnerStatus(expediente.partnerId);
  const decidir = useDecidePartnerMutation(expediente.partnerId);
  const reevaluar = useRequestKybReviewMutation(expediente.partnerId);
  // `POST :partnerId/kyb-review` exige `partner.kyb.request` (OPERATIONS_MANAGER / SUPER_ADMIN):
  // el botón sólo se ofrece a quien el backend va a dejar pasar.
  const { hasPermission } = useAuth();
  const puedePedirVerificacion = hasPermission("partner.kyb.request");
  const pedirVerificacion = () => {
    // El error se pinta desde `reevaluar.error`; aquí sólo se evita la promesa rechazada suelta.
    reevaluar.mutateAsync(undefined).catch(() => undefined);
  };
  const errorDeDecision = decidir.error
    ? partnerActionErrorMessage(
        decidir.error,
        "No se pudo registrar la decisión.",
      )
    : null;

  const perfil = (estado.data?.profile ?? estado.data ?? {}) as Record<
    string,
    unknown
  >;
  const onboardingStatus = String(
    perfil.onboardingStatus ?? expediente.onboardingStatus,
  );
  const enRevision = onboardingStatus === "under_review";
  const decision = (perfil.decision ??
    expediente.decision ??
    null) as PartnerDecisionProvenance | null;
  // Con caso abierto en el Motor, decidir aquí responde 409: no se ofrece el formulario.
  const delegadoAlMotor = Boolean(decision?.manualReviewCaseCode);

  return (
    <>
      <DrawerPanel
        open
        title={safeText(expediente.legalName ?? expediente.tradeName)}
        onClose={onClose}
      >
        {estado.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {estado.error ? (
          <ErrorState
            description={
              isAtlasApiError(estado.error)
                ? estado.error.message
                : "No se pudo leer el expediente."
            }
            requestId={
              isAtlasApiError(estado.error) ? estado.error.requestId : undefined
            }
            onRetry={() => void estado.refetch()}
          />
        ) : null}

        {estado.data ? (
          <div className="space-y-5">
            <KeyValueGrid
              items={[
                { label: "Razón social", value: safeText(perfil.legalName) },
                {
                  label: "Nombre de fachada",
                  value: safeText(perfil.tradeName),
                },
                { label: "NIT", value: safeText(perfil.taxId), mono: true },
                {
                  label: "Estado",
                  value: onboardingStatusLabel(onboardingStatus),
                },
                {
                  label: "Enviado",
                  value: formatDateTime(expediente.submittedAt),
                },
                {
                  label: "Comisión (MDR)",
                  value: perfil.mdrRatePercent
                    ? `${String(perfil.mdrRatePercent)} % · se fija en el ERP`
                    : "Sin fijar · se fija en el ERP",
                },
              ]}
            />

            <PartnerDecisionProvenanceCard decision={decision} />

            <PartnerFolderLink partnerId={expediente.partnerId} />

            {enRevision && delegadoAlMotor ? (
              <div className="space-y-3">
                <p className="text-sm text-atlas-muted">
                  Este expediente lo resuelve una persona en la cola del Motor,
                  donde está la traza de la ejecución que abrió el caso. Cuando
                  se resuelva, el expediente se actualiza solo.
                </p>
                <PedirVerificacion
                  texto="Volver a pedir la verificación"
                  permitido={puedePedirVerificacion}
                  pendiente={reevaluar.isPending}
                  error={reevaluar.error}
                  onPedir={pedirVerificacion}
                />
              </div>
            ) : null}

            {enRevision && !delegadoAlMotor ? (
              <div className="space-y-3">
                <p className="text-sm text-atlas-muted">
                  El Motor no abrió caso para este expediente, así que la
                  decisión manual es la única que hay. Pedir la verificación de
                  nuevo es preferible cuando el Motor estaba caído al enviarlo.
                </p>
                <PedirVerificacion
                  texto="Pedir la verificación al Motor"
                  permitido={puedePedirVerificacion}
                  pendiente={reevaluar.isPending}
                  error={reevaluar.error}
                  onPedir={pedirVerificacion}
                />
                <Field
                  tooltip="Lo que el comercio debe corregir; lo lee tal cual en su portal."
                  label="Motivo del rechazo"
                  hint="Obligatorio para rechazar; el comercio lo verá y es lo que le dice qué corregir."
                >
                  <Textarea
                    rows={3}
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      decidir.reset();
                      setPendiente("aprobar");
                    }}
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={motivo.trim().length < 3}
                    onClick={() => {
                      decidir.reset();
                      setPendiente("rechazar");
                    }}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ) : null}

            {!enRevision ? (
              <p className="text-sm text-atlas-muted">
                {`Este expediente está «${onboardingStatusLabel(onboardingStatus).toLowerCase()}», así que no admite decisión.`}
              </p>
            ) : null}

            <PartnerNetworkLists estado={estado.data} />

            <details>
              <summary className="cursor-pointer text-sm font-semibold text-atlas-text">
                Datos técnicos del expediente
              </summary>
              <p className="my-2 text-xs text-atlas-muted">
                Los mismos datos de arriba sin formato, para soporte. Los
                documentos no están aquí: se ven en Archivos.
              </p>
              <JsonViewer value={estado.data} />
            </details>
          </div>
        ) : null}
      </DrawerPanel>

      <ConfirmDialog
        open={pendiente !== null}
        title={
          pendiente === "aprobar"
            ? "Aprobar el expediente"
            : "Rechazar el expediente"
        }
        description={`${
          pendiente === "aprobar"
            ? "El comercio queda verificado y la decisión queda con tu usuario y su fecha. Sus QR de cobro no cambian: cada uno sigue esperando su propia revisión en la cola de QR."
            : "El comercio queda rechazado con el motivo escrito. Podrá corregir y volver a enviar."
        }${errorDeDecision ? ` · No se registró: ${errorDeDecision}` : ""}`}
        confirmText={pendiente === "aprobar" ? "Aprobar" : "Rechazar"}
        isLoading={decidir.isPending}
        onCancel={() => {
          decidir.reset();
          setPendiente(null);
        }}
        onConfirm={() => {
          const aprobado = pendiente === "aprobar";
          // En error el diálogo SIGUE abierto y dice por qué: cerrarlo mudo dejaba creer que se
          // había decidido. Sólo el éxito cierra el diálogo y el cajón.
          decidir
            .mutateAsync(
              aprobado
                ? { approved: true }
                : { approved: false, rejectionReason: motivo.trim() },
            )
            .then(() => {
              setPendiente(null);
              onClose();
            })
            .catch(() => undefined);
        }}
      />
    </>
  );
}
