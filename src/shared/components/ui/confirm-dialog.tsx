"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
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
  if (!open) return null;
  const requiresTypedConfirmation = Boolean(typedConfirmationPhrase);
  const canConfirm =
    !requiresTypedConfirmation || typedValue.trim() === typedConfirmationPhrase;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg border border-atlas-border bg-white p-5 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-50 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-atlas-text">{title}</h2>
            <p className="mt-1 text-sm text-atlas-muted">{description}</p>
          </div>
        </div>
        {requiresTypedConfirmation ? (
          <div className="mt-4">
            <label className="text-xs font-medium text-atlas-muted">
              Escribe &quot;{typedConfirmationPhrase}&quot; para habilitar la
              ejecución
            </label>
            <Input
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
      </div>
    </div>
  );
}
