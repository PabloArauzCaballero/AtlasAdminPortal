"use client";

import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { merchantUserStatusLabel, statusChangeNeedsReason } from "./labels";
import type { MerchantUserProfile } from "./types";

const MINIMO_MOTIVO = 8;

/**
 * Cambiar el estado del acceso de una persona de comercio, con su motivo.
 *
 * El backend acepta `reason` y lo guarda en la auditoría operativa. Antes la pantalla usaba un
 * diálogo de confirmación sin campo y el motivo nunca viajaba: la baja de un acceso quedaba sin
 * explicación. Suspender o dar de baja lo exige (ocho caracteres, lo mismo que el resto de
 * acciones auditadas); reactivar lo admite pero no lo pide.
 */
export function StatusChangeDialog({
  usuario,
  destino,
  isPending,
  error,
  onCancel,
  onConfirm,
}: Readonly<{
  usuario: MerchantUserProfile;
  destino: string;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string | undefined) => void;
}>) {
  const tituloId = useId();
  const [motivo, setMotivo] = useState("");
  const etiqueta = merchantUserStatusLabel(destino);
  const exige = statusChangeNeedsReason(destino);
  const limpio = motivo.trim();
  const valido = exige
    ? limpio.length >= MINIMO_MOTIVO
    : limpio.length === 0 || limpio.length >= MINIMO_MOTIVO;

  return (
    <DialogShell
      open
      labelledBy={tituloId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-md rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={tituloId} className="text-base font-semibold text-atlas-text">
        {`Cambiar el acceso a «${etiqueta}»`}
      </h2>
      <p className="mt-1 text-sm text-atlas-muted">
        {`${usuario.fullName ?? usuario.email} pasará a «${etiqueta.toLowerCase()}». Suspender o dar de baja corta su acceso al portal del comercio; su historial se conserva.`}
      </p>
      <div className="mt-4">
        <Field
          label={exige ? "Motivo" : "Motivo (opcional)"}
          tooltip="Por qué cambias el acceso; queda escrito en la auditoría operativa junto a quién lo hizo."
          hint={`Mínimo ${MINIMO_MOTIVO} caracteres.`}
        >
          <Textarea
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ej: la persona dejó el comercio el 28/09"
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-700">{`No se cambió: ${error}`}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!valido || isPending}
          isLoading={isPending}
          loadingText="Cambiando…"
          onClick={() => onConfirm(limpio || undefined)}
        >
          Cambiar
        </Button>
      </div>
    </DialogShell>
  );
}
