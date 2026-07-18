"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  MANUAL_REVIEW_DECISIONS,
  NEXT_STATUS_OPTIONS,
} from "./decision-options";
import {
  manualReviewDefaults,
  manualReviewSchema,
  toManualReviewInput,
  type ManualReviewForm,
} from "./decision-schemas";
import { useDecideManualReviewCaseMutation } from "./hooks";
import type { WorkQueueItem } from "./types";

export function ManualReviewDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const decide = useDecideManualReviewCaseMutation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ManualReviewForm>({
    resolver: zodResolver(manualReviewSchema),
    defaultValues: manualReviewDefaults,
  });

  const decision = watch("decision");
  const notesRequired =
    decision === "rejected" || decision === "request_more_information";

  const onSubmit = handleSubmit((values) => {
    decide.mutate({ caseId: item.caseId, body: toManualReviewInput(values) });
  });

  return (
    <DrawerPanel
      open
      title={`Decidir caso de revisión manual · #${item.caseId}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Decisión">
          <Select {...register("decision")}>
            {MANUAL_REVIEW_DECISIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Código de motivo" error={errors.reasonCode?.message}>
          <Textarea
            className="min-h-9"
            placeholder="Ej: identity_verified, insufficient_documents"
            {...register("reasonCode")}
          />
        </Field>
        <Field
          label="Notas"
          error={errors.notes?.message}
          hint={
            notesRequired
              ? "Obligatorio: el backend exige notas al rechazar o pedir más información."
              : "Opcional."
          }
        >
          <Textarea className="min-h-20" {...register("notes")} />
        </Field>
        <Field label="Próximo estado del cliente (opcional)">
          <Select {...register("nextCustomerStatus")}>
            <option value="">Sin cambio</option>
            {NEXT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {decide.error ? (
          <ErrorState
            title="No se pudo registrar la decisión"
            description={
              isAtlasApiError(decide.error)
                ? decide.error.message
                : "Error inesperado."
            }
            requestId={
              isAtlasApiError(decide.error) ? decide.error.requestId : undefined
            }
          />
        ) : null}
        {decide.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Caso #{decide.data.caseId} cerrado con decisión &quot;
            {decide.data.decision}&quot;.
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={decide.isPending}
            loadingText="Guardando…"
            disabled={decide.isPending}
          >
            Registrar decisión
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
