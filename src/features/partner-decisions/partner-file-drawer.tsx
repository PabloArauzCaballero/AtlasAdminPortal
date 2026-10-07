"use client";

import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { usePartnerStatus, useRequestKybReviewMutation } from "./hooks";
import { onboardingStatusLabel } from "./labels";
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
 * Aprobar o rechazar un expediente NO se hace desde esta consola (Pablo, 2026-10-07: «debe salir en el Decision Engine la
 * habilidad de aceptar los expedientes de un partner; lo de dar credenciales está bien del portal admin, pero lo otro no»).
 * Antes había una salida manual cuando el Motor no abría caso, y eso fue justo lo que se usó cuando el Motor falló al
 * enviar: el expediente se aprobó por aquí, sin ejecución ni caso, fuera del gobierno del Motor. Ahora sin caso sólo
 * se puede PEDIR la verificación; la decisión la toma una persona en la cola MERCHANT_KYB y el expediente se actualiza solo.
 */
export function PartnerFileDrawer({
  expediente,
  onClose,
}: Readonly<{ expediente: PartnerQueueItem; onClose: () => void }>) {
  const estado = usePartnerStatus(expediente.partnerId);
  const reevaluar = useRequestKybReviewMutation(expediente.partnerId);
  // `POST :partnerId/kyb-review` exige `partner.kyb.request` (OPERATIONS_MANAGER / SUPER_ADMIN):
  // el botón sólo se ofrece a quien el backend va a dejar pasar.
  const { hasPermission } = useAuth();
  const puedePedirVerificacion = hasPermission("partner.kyb.request");
  const pedirVerificacion = () => {
    // El error se pinta desde `reevaluar.error`; aquí sólo se evita la promesa rechazada suelta.
    reevaluar.mutateAsync(undefined).catch(() => undefined);
  };
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
                  El Motor todavía no abrió caso para este expediente. Aquí no
                  se aprueba ni se rechaza: la decisión la toma una persona en
                  la cola de Revisión manual del Motor. Si se envió con el Motor
                  caído, pide la verificación de nuevo; en pocos minutos el caso
                  aparece en la cola «MERCHANT_KYB».
                </p>
                <PedirVerificacion
                  texto="Pedir la verificación al Motor"
                  permitido={puedePedirVerificacion}
                  pendiente={reevaluar.isPending}
                  error={reevaluar.error}
                  onPedir={pedirVerificacion}
                />
              </div>
            ) : null}

            {!enRevision ? (
              <p className="text-sm text-atlas-muted">
                {`Este expediente está «${onboardingStatusLabel(onboardingStatus).toLowerCase()}», así que no admite decisión.`}
              </p>
            ) : null}

            <PartnerNetworkLists
              estado={estado.data}
              partnerId={expediente.partnerId}
            />

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
    </>
  );
}
