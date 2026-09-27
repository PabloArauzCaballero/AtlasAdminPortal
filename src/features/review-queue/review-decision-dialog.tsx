"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import type { ReviewDecisionInput } from "@/features/systems/types";
import type { PendingReview } from "./types";

/** Mínimo de caracteres del motivo al rechazar: por debajo no explica nada a quien lo lea luego. */
export const MIN_REJECT_REASON = 5;
/** Techo del esquema del servidor (`notes` ≤ 1000). */
export const MAX_REASON = 1000;

const DECISION_COPY: Record<
  ReviewDecisionInput["reviewStatus"],
  { title: string; confirm: string; effect: string }
> = {
  APPROVED: {
    title: "Aprobar detección",
    confirm: "Aprobar",
    effect:
      "Queda como dato confiable: QA, gobierno y reportes empezarán a usarla.",
  },
  NEEDS_REVIEW: {
    title: "Devolver a revisión",
    confirm: "Marcar para revisión",
    effect: "Vuelve a la cola hasta que alguien la confirme o la descarte.",
  },
  REJECTED: {
    title: "Rechazar detección",
    confirm: "Rechazar",
    effect:
      "Se descarta por incorrecta. Explica el motivo: es lo que verá quien corrija el escáner.",
  },
};

/**
 * El cuerpo que se manda al servidor.
 *
 * El motivo viaja en `notes`, que el servidor guarda junto a la decisión. Antes se mandaba siempre
 * el mismo texto fijo, así que la bitácora decía lo mismo para cada revisión y no servía para
 * reconstruir por qué se aprobó o descartó algo.
 */
export function buildReviewBody(
  decision: ReviewDecisionInput["reviewStatus"],
  reason: string,
): ReviewDecisionInput {
  const notes = reason.trim();
  return {
    reviewStatus: decision,
    confidenceLevel: decision === "APPROVED" ? "HIGH" : "MEDIUM",
    ...(notes ? { notes: notes.slice(0, MAX_REASON) } : {}),
  };
}

export function reasonError(
  decision: ReviewDecisionInput["reviewStatus"],
  reason: string,
): string | undefined {
  if (decision !== "REJECTED") return undefined;
  return reason.trim().length < MIN_REJECT_REASON
    ? `Para rechazar, escribe el motivo (mínimo ${MIN_REJECT_REASON} caracteres).`
    : undefined;
}

export function ReviewDecisionDialog({
  pending,
  isLoading,
  onCancel,
  onConfirm,
}: Readonly<{
  pending: PendingReview | null;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (body: ReviewDecisionInput) => void;
}>) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  // El diálogo no se desmonta al cerrarse: sin esto el motivo de una fila aparecería en la siguiente.
  useEffect(() => {
    setReason("");
    setTouched(false);
  }, [pending?.targetId, pending?.decision]);

  if (!pending) return null;
  const copy = DECISION_COPY[pending.decision];
  const error = reasonError(pending.decision, reason);

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-md animate-scale-in rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={titleId} className="text-base font-semibold text-atlas-text">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-atlas-muted">
        <span className="font-mono text-xs text-atlas-text">
          {pending.title}
        </span>
        . {copy.effect}
      </p>
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (error) return;
          onConfirm(buildReviewBody(pending.decision, reason));
        }}
      >
        <Field
          label="Motivo"
          required={pending.decision === "REJECTED"}
          tooltip="Por qué confirmas o descartas esta detección; queda guardado junto a la decisión."
          error={touched ? error : undefined}
          hint={`${reason.trim().length}/${MAX_REASON}`}
        >
          <Textarea
            rows={3}
            maxLength={MAX_REASON}
            value={reason}
            placeholder="Ej.: la columna guarda el número de carnet, es dato personal."
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={pending.decision === "REJECTED" ? "danger" : "primary"}
            isLoading={isLoading}
            loadingText="Guardando…"
          >
            {copy.confirm}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
