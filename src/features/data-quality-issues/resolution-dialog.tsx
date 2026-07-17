"use client";

import { useId } from "react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import type { ResolutionState } from "./types";

/** Mínimo para que la nota sirva como rastro de auditoría y no como relleno. */
export const MIN_RESOLUTION_NOTES_LENGTH = 10;

export function isResolutionComplete(
  resolution: NonNullable<ResolutionState>,
): boolean {
  return (
    resolution.reasonCode.trim().length > 0 &&
    resolution.notes.trim().length >= MIN_RESOLUTION_NOTES_LENGTH
  );
}

export function ResolutionDialog({
  resolution,
  isLoading,
  error,
  onCancel,
  onConfirm,
  onChange,
}: Readonly<{
  resolution: NonNullable<ResolutionState>;
  isLoading: boolean;
  error?: unknown;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (value: NonNullable<ResolutionState>) => void;
}>) {
  const titleId = useId();
  const canConfirm = isResolutionComplete(resolution) && !isLoading;
  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="z-50 flex items-center justify-center bg-slate-950/40 p-4"
      panelClassName="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <div>
        <h2 id={titleId} className="sr-only">
          {`Cerrar issue #${resolution.issue.issueId}`}
        </h2>
        <SectionHeader
          title={`Cerrar issue #${resolution.issue.issueId}`}
          description="Completa resolución y notas. Evita incluir datos sensibles."
        />
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <Field label="Resolución">
            <Select
              value={resolution.resolution}
              onChange={(event) =>
                onChange({
                  ...resolution,
                  resolution: event.target.value as "resolved" | "ignored",
                })
              }
            >
              <option value="resolved">resolved</option>
              <option value="ignored">ignored</option>
            </Select>
          </Field>
          <Field label="Razón">
            <Select
              value={resolution.reasonCode}
              onChange={(event) =>
                onChange({ ...resolution, reasonCode: event.target.value })
              }
            >
              <option value="manual_review">manual_review</option>
              <option value="source_validated">source_validated</option>
              <option value="false_positive">false_positive</option>
              <option value="temporary_exception">temporary_exception</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field
              label={`Notas (obligatorio, mínimo ${MIN_RESOLUTION_NOTES_LENGTH} caracteres)`}
              hint="Explica criterio operativo sin pegar datos personales. Queda en la auditoría del issue."
            >
              <Textarea
                value={resolution.notes}
                placeholder="Ejemplo: validado contra fuente primaria."
                onChange={(event) =>
                  onChange({ ...resolution, notes: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
        {/* El error va dentro del modal: pintado en la página quedaría detrás
            del backdrop z-50 y el operador no vería por qué falló. */}
        {error ? (
          <div className="mt-4">
            <ErrorState
              description={
                isAtlasApiError(error)
                  ? error.message
                  : "No se pudo cerrar el issue."
              }
              requestId={isAtlasApiError(error) ? error.requestId : undefined}
            />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!canConfirm} onClick={onConfirm}>
            {isLoading ? "Procesando…" : "Cerrar issue"}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
