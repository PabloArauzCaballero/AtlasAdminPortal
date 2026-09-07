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
import { useDecidePartnerMutation, usePartnerStatus } from "./hooks";
import type { PartnerQueueItem } from "./types";

/**
 * El expediente de un comercio, abierto desde la cola para decidirlo.
 *
 * Se pide el expediente COMPLETO al abrir y no se aprovecha la fila de la cola: la cola trae lo
 * justo para elegir a quién atender, y firmar una verificación con cuatro campos resumidos sería
 * firmar sin haber mirado. El volcado íntegro va al final, porque los documentos y las
 * verificaciones de contacto viven ahí y son justamente lo que hay que revisar.
 *
 * La comisión (MDR) se enseña, no se edita: se negocia y se lleva en el ERP.
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

  const perfil = (estado.data?.profile ?? estado.data ?? {}) as Record<
    string,
    unknown
  >;
  const onboardingStatus = String(
    perfil.onboardingStatus ?? expediente.onboardingStatus,
  );
  const enRevision = onboardingStatus === "under_review";

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

            {enRevision ? (
              <div className="space-y-3">
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
            ) : (
              <p className="text-sm text-atlas-muted">
                {`Este expediente está en «${onboardingStatus || "sin estado"}», así que no admite decisión.`}
              </p>
            )}

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
