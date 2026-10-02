"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { nombreDelComercio } from "./partner-qr-columns";
import { usePartnerQrImage, useReviewPartnerQrMutation } from "./hooks";
import { partnerActionErrorMessage, qrKindLabel } from "./labels";
import type { PartnerQrPending } from "./types";

/**
 * La revisión de UN QR de cobro: la imagen y las dos decisiones.
 *
 * Se pinta la IMAGEN —por blob, con la sesión— porque decidir sobre una cuenta de cobro mirando sólo
 * el hash es firmar sin haber visto. Los botones sólo aparecen con `partner.qr.review`
 * (MERCHANT_OPERATIONS): el backend responde 403 sin él, y una promesa que termina en 403 no es una
 * promesa. El aviso para quien no lo tiene va en palabras, sin el código del permiso.
 *
 * Se monta sólo mientras está abierto (el padre lo pinta condicionalmente): la nota que se escribió
 * para un QR no sobrevive a otro. Al decidir con éxito se cierra; el QR sale de la cola porque la
 * mutación invalida la lista.
 */
export function PartnerQrDialog({
  qr,
  onClose,
}: Readonly<{ qr: PartnerQrPending; onClose: () => void }>) {
  const titleId = useId();
  const { hasPermission } = useAuth();
  const puedeRevisar = hasPermission("partner.qr.review");
  const revisar = useReviewPartnerQrMutation();
  const imagen = usePartnerQrImage(qr.partnerId, qr.qrId);
  const [nota, setNota] = useState("");
  const [pendiente, setPendiente] = useState<"aprobar" | "rechazar" | null>(
    null,
  );
  const nombre = nombreDelComercio(qr);
  const tipo = qrKindLabel(qr.qrKind);
  /*
   * Desde el 2026-10-02 el QR nace activo al confirmarlo el comercio. Un QR ACTIVO sólo admite
   * REVOCACIÓN (con nota); «aprobar» queda para los que quedaron en `pending_review` antes.
   */
  const activo = qr.status === "active";

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="max-h-full w-full max-w-xl animate-scale-in overflow-y-auto rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={titleId} className="text-base font-semibold text-atlas-text">
        {activo ? "Revocar" : "Revisar"} {tipo} de {nombre}
      </h2>
      <p className="mt-1 text-sm text-atlas-muted">
        {activo
          ? "Este código es el que ven HOY los clientes del comercio al pagar. Revocarlo lo retira en el acto y el comercio se queda sin QR vigente hasta subir otro; la nota es lo que leerá para entender por qué."
          : "Este código dice a qué cuenta transfieren los clientes del comercio. Quedó pendiente antes del 2 de octubre de 2026: activarlo lo enseña en la app; rechazarlo exige una nota, que es lo único que le dice al comercio qué corregir."}
      </p>

      <div className="my-4 flex justify-center rounded-lg border border-dashed border-slate-200 bg-atlas-soft p-3">
        {imagen.isLoading ? <LoadingSkeleton rows={2} /> : null}
        {imagen.url ? (
          // `unoptimized`: el origen es un blob local con la sesión puesta; el optimizador de Next
          // no puede pedirlo.
          <Image
            src={imagen.url}
            alt={`${tipo} de ${nombre}`}
            width={320}
            height={320}
            unoptimized
            className="h-auto max-h-56 w-auto"
          />
        ) : null}
        {imagen.error ? (
          <p className="text-xs text-red-700">
            No se pudo cargar la imagen del QR.
          </p>
        ) : null}
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-atlas-muted">Entidad</dt>
        <dd className="font-mono">{qr.bankInstitutionCode ?? "—"}</dd>
        <dt className="text-atlas-muted">Cuenta</dt>
        <dd className="font-mono">{qr.accountNumberMasked ?? "—"}</dd>
        <dt className="text-atlas-muted">Huella del archivo</dt>
        <dd className="font-mono">{qr.fingerprint}</dd>
        <dt className="text-atlas-muted">Subido</dt>
        <dd>{formatDateTime(qr.createdAt)}</dd>
        <dt className="text-atlas-muted">N.º de comercio</dt>
        <dd className="select-all font-mono">{qr.partnerId}</dd>
      </dl>

      {puedeRevisar ? (
        <div className="space-y-2">
          <Field
            tooltip="Explicación que lee el comercio; obligatoria si rechazas o revocas su QR."
            label="Nota para el comercio"
            hint={
              activo
                ? "Obligatoria: es lo que el comercio lee para entender la revocación."
                : "Obligatoria para rechazar: es lo que el comercio lee para corregir."
            }
          >
            <Textarea
              rows={2}
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {activo ? null : (
              <Button variant="primary" onClick={() => setPendiente("aprobar")}>
                Activar QR
              </Button>
            )}
            <Button
              variant="danger"
              disabled={nota.trim().length < 3}
              onClick={() => setPendiente("rechazar")}
            >
              {activo ? "Revocar QR" : "Rechazar QR"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cerrar sin decidir
            </Button>
          </div>
          {revisar.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {partnerActionErrorMessage(
                revisar.error,
                "No se pudo revisar el QR.",
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-atlas-muted">
            Tu usuario no puede activar ni revocar QR de cobro: lo hace el
            equipo de Operaciones de comercios.
          </p>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendiente !== null}
        title={
          pendiente === "aprobar"
            ? "Activar el QR"
            : activo
              ? "Revocar el QR"
              : "Rechazar el QR"
        }
        description={
          pendiente === "aprobar"
            ? "Desde ahora los clientes de este comercio verán este código al pagar. Si había otro activo, queda archivado."
            : activo
              ? "Los clientes dejan de ver este código AHORA. El comercio verá la nota y tendrá que subir otro QR para volver a cobrar."
              : "El comercio verá la nota y tendrá que subir otra imagen."
        }
        confirmText={
          pendiente === "aprobar" ? "Activar" : activo ? "Revocar" : "Rechazar"
        }
        isLoading={revisar.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          const aprobado = pendiente === "aprobar";
          void revisar
            .mutateAsync({
              partnerId: qr.partnerId,
              qrId: qr.qrId,
              approved: aprobado,
              ...(nota.trim() ? { note: nota.trim() } : {}),
            })
            .then(() => onClose())
            // En error el diálogo de confirmación se cierra y el motivo queda pintado bajo los botones.
            .catch(() => setPendiente(null));
        }}
      />
    </DialogShell>
  );
}
