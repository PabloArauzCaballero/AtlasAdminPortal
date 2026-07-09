"use client";

import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { SectionHeader } from "@/shared/components/layout/page-header";
import type { ResolutionState } from "./types";

export function ResolutionDialog({
  resolution,
  isLoading,
  onCancel,
  onConfirm,
  onChange,
}: Readonly<{
  resolution: NonNullable<ResolutionState>;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (value: NonNullable<ResolutionState>) => void;
}>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle">
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
              label="Notas"
              hint="Explica criterio operativo sin pegar datos personales."
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
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={isLoading} onClick={onConfirm}>
            {isLoading ? "Procesando…" : "Cerrar issue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
