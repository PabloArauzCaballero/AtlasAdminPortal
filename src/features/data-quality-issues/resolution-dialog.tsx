"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { FormSelect } from "@/shared/components/ui/form-select";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  MIN_RESOLUTION_NOTES_LENGTH,
  resolutionDefaults,
  resolutionSchema,
  type ResolutionForm,
} from "./resolution-schema";

export function ResolutionDialog({
  issueId,
  isLoading,
  error,
  onCancel,
  onSubmit,
}: Readonly<{
  issueId: string;
  isLoading: boolean;
  error?: unknown;
  onCancel: () => void;
  onSubmit: (values: ResolutionForm) => void;
}>) {
  const titleId = useId();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResolutionForm>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: resolutionDefaults,
  });

  // `handleSubmit` no llama a esto si el esquema no pasa: no hay forma de cerrar
  // un issue sin motivo ni notas suficientes, ni de enviarlo dos veces.
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <form onSubmit={submit}>
        <h2 id={titleId} className="sr-only">
          {`Cerrar issue #${issueId}`}
        </h2>
        <SectionHeader
          title={`Cerrar issue #${issueId}`}
          description="Completa resolución y notas. Evita incluir datos sensibles."
        />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-[180px_1fr]">
          <Field label="Resolución" error={errors.resolution?.message}>
            <FormSelect
              control={control}
              name="resolution"
              options={[
                {
                  value: "resolved",
                  label: "resolved",
                  description: "El problema se corrigió.",
                },
                {
                  value: "ignored",
                  label: "ignored",
                  description:
                    "Se cierra sin corregir el dato; el motivo queda en las notas.",
                },
              ]}
            />
          </Field>
          <Field label="Razón" error={errors.reasonCode?.message}>
            <FormSelect
              control={control}
              name="reasonCode"
              options={[
                "manual_review",
                "source_validated",
                "false_positive",
                "temporary_exception",
              ].map((value) => ({ value, label: value }))}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label={`Notas (obligatorio, mínimo ${MIN_RESOLUTION_NOTES_LENGTH} caracteres)`}
              error={errors.notes?.message}
              hint="Explica criterio operativo sin pegar datos personales. Queda en la auditoría del issue."
            >
              <Textarea
                placeholder="Ejemplo: validado contra fuente primaria."
                {...register("notes")}
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
          <Button type="button" disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Procesando…" : "Cerrar issue"}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
