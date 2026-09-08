"use client";

import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
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
import { PartnerDecisionProvenanceCard } from "./partner-decision-provenance";
import type { PartnerDecisionProvenance, PartnerQueueItem } from "./types";

/**
 * El expediente de un comercio, abierto desde la cola para decidirlo.
 *
 * Se pide el expediente COMPLETO al abrir y no se aprovecha la fila de la cola: la cola trae lo
 * justo para elegir a quién atender, y firmar una verificación con cuatro campos resumidos sería
 * firmar sin haber mirado. El volcado íntegro va al final, porque los documentos y las
 * verificaciones de contacto viven ahí y son justamente lo que hay que revisar.
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
                { label: "Estado", value: onboardingStatus },
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

            {enRevision && delegadoAlMotor ? (
              <div className="space-y-3">
                <p className="text-sm text-atlas-muted">
                  Este expediente lo resuelve una persona en la cola del Motor,
                  donde está la traza de la ejecución que abrió el caso. Cuando
                  se resuelva, el expediente se actualiza solo.
                </p>
                <Button
                  disabled={reevaluar.isPending}
                  onClick={() => void reevaluar.mutateAsync(undefined)}
                >
                  Volver a pedir la verificación
                </Button>
                {reevaluar.error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {isAtlasApiError(reevaluar.error)
                      ? reevaluar.error.message
                      : "No se pudo pedir la verificación."}
                  </p>
                ) : null}
              </div>
            ) : null}

            {enRevision && !delegadoAlMotor ? (
              <div className="space-y-3">
                <p className="text-sm text-atlas-muted">
                  El Motor no abrió caso para este expediente, así que la
                  decisión manual es la única que hay. Pedir la verificación de
                  nuevo es preferible cuando el Motor estaba caído al enviarlo.
                </p>
                <Button
                  disabled={reevaluar.isPending}
                  onClick={() => void reevaluar.mutateAsync(undefined)}
                >
                  Pedir la verificación al Motor
                </Button>
                <Field
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
                    onClick={() => setPendiente("aprobar")}
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={motivo.trim().length < 3}
                    onClick={() => setPendiente("rechazar")}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ) : null}

            {!enRevision ? (
              <p className="text-sm text-atlas-muted">
                {`Este expediente está en «${onboardingStatus || "sin estado"}», así que no admite decisión.`}
              </p>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-atlas-text">
                Expediente completo
              </h3>
              <JsonViewer value={estado.data} />
            </div>
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
        description={
          pendiente === "aprobar"
            ? "El comercio queda verificado: sus QR resolverán y sus ventas podrán atribuirse. La decisión queda con tu usuario y su fecha."
            : "El comercio queda rechazado con el motivo escrito. Podrá corregir y volver a enviar."
        }
        confirmText={pendiente === "aprobar" ? "Aprobar" : "Rechazar"}
        isLoading={decidir.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          const aprobado = pendiente === "aprobar";
          void decidir
            .mutateAsync(
              aprobado
                ? { approved: true }
                : { approved: false, rejectionReason: motivo.trim() },
            )
            .then(() => onClose())
            .finally(() => setPendiente(null));
        }}
      />
    </>
  );
}
