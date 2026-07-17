"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { DialogShell } from "./dialog-shell";
import { Input } from "./input";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading,
  typedConfirmationPhrase,
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  /** When set, the user must type this exact phrase before the confirm button enables (double-confirmation). */
  typedConfirmationPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const [typedValue, setTypedValue] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();

  // `open={false}` no desmonta este componente (el padre lo deja montado y el
  // early return solo evita pintarlo), así que sin este reset la frase tecleada
  // sobrevive: al reabrir, la doble confirmación de una acción destructiva
  // aparecía ya habilitada.
  useEffect(() => {
    if (open) setTypedValue("");
  }, [open]);

  const requiresTypedConfirmation = Boolean(typedConfirmationPhrase);
  const canConfirm =
    (!requiresTypedConfirmation ||
      typedValue.trim() === typedConfirmationPhrase) &&
    !isLoading;

  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="z-50 flex items-center justify-center bg-slate-950/40 p-4"
      panelClassName="w-full max-w-md rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-50 p-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id={titleId} className="text-base font-semibold text-atlas-text">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-atlas-muted">
            {description}
          </p>
        </div>
      </div>
      {requiresTypedConfirmation ? (
        <div className="mt-4">
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-atlas-muted"
          >
            Escribe &quot;{typedConfirmationPhrase}&quot; para habilitar la
            ejecución
          </label>
          <Input
            id={inputId}
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            placeholder={typedConfirmationPhrase}
            className="mt-1 font-mono"
          />
        </div>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!canConfirm}
          isLoading={isLoading}
          loadingText="Procesando…"
          variant="primary"
        >
          {confirmText}
        </Button>
      </div>
    </DialogShell>
  );
}
