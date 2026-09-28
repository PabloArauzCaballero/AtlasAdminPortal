"use client";

import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { MIN_REASON_LENGTH, TRANSITION_COPY } from "./labels";
import type { PrivacyTransitionTarget } from "./types";

/**
 * Confirmar un cambio de estado. Cerrar (atendida o rechazada) exige motivo: el backend lo exige
 * igual (422), pero pedirlo aquí evita el viaje y dice por qué antes de enviarlo.
 *
 * El error va DENTRO del diálogo: pintado en la página quedaría detrás del fondo y la persona no
 * vería por qué no se cerró (p. ej. un 409 porque otra persona la movió antes).
 */
export function PrivacyTransitionDialog({
  requestCode,
  target,
  isPending,
  error,
  onCancel,
  onConfirm,
}: Readonly<{
  requestCode: string;
  target: PrivacyTransitionTarget;
  isPending: boolean;
  error?: unknown;
  onCancel: () => void;
  onConfirm: (reason: string | undefined) => void;
}>) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const copy = TRANSITION_COPY[target];
  const trimmed = reason.trim();
  const reasonOk = !copy.needsReason || trimmed.length >= MIN_REASON_LENGTH;
  // Tomarla admite nota opcional, pero una nota de 1-9 caracteres la rechazaría el backend.
  const optionalTooShort =
    !copy.needsReason &&
    trimmed.length > 0 &&
    trimmed.length < MIN_REASON_LENGTH;

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-xl rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={titleId} className="mb-1 text-base font-semibold text-atlas-text">
        {copy.title}
      </h2>
      <p className="mb-1 font-mono text-xs text-atlas-muted">{requestCode}</p>
      <p className="mb-4 text-sm text-atlas-muted">{copy.description}</p>
      <Field
        tooltip="Queda en el historial de la solicitud y en la auditoría; no pegues datos personales."
        label={
          copy.needsReason
            ? `Motivo (obligatorio, mínimo ${MIN_REASON_LENGTH} caracteres)`
            : "Nota (opcional)"
        }
        error={
          optionalTooShort
            ? `Si escribes una nota, que tenga al menos ${MIN_REASON_LENGTH} caracteres.`
            : undefined
        }
      >
        <Textarea
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {error ? (
        <div className="mt-4">
          <ErrorState
            title="No se pudo cambiar el estado."
            description={
              isAtlasApiError(error)
                ? error.message
                : "Vuelve a intentarlo en unos segundos."
            }
            requestId={isAtlasApiError(error) ? error.requestId : undefined}
          />
        </div>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={target === "rejected" ? "danger" : "primary"}
          isLoading={isPending}
          disabled={!reasonOk || optionalTooShort || isPending}
          onClick={() => onConfirm(trimmed || undefined)}
        >
          {copy.action}
        </Button>
      </div>
    </DialogShell>
  );
}
