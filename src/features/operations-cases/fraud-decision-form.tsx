"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  FRAUD_DECISIONS,
  FRAUD_NEXT_STATUS_VALUES,
  NEXT_STATUS_OPTIONS,
  NO_STATUS_CHANGE,
} from "./decision-options";
import {
  fraudDefaults,
  fraudSchema,
  toFraudInput,
  type FraudForm,
} from "./decision-schemas";
import { useDecideFraudCaseMutation } from "./hooks";
import { AvisoDeExpediente } from "@/features/files/expediente-notice";
import type { WorkQueueItem } from "./types";

export function FraudDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const decide = useDecideFraudCaseMutation();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FraudForm>({
    resolver: zodResolver(fraudSchema),
    defaultValues: fraudDefaults,
  });

  const decision = watch("decision");
  const reasonRequired =
    decision === "confirmed_fraud" || decision === "blocked";
  const nextStatusOptions = NEXT_STATUS_OPTIONS.filter((option) =>
    (FRAUD_NEXT_STATUS_VALUES as string[]).includes(option.value),
  );

  const onSubmit = handleSubmit((values) => {
    decide.mutate({ caseId: item.caseId, body: toFraudInput(values) });
  });

  return (
    <DrawerPanel
      open
      title={`Decidir caso de fraude · #${item.caseId}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AvisoDeExpediente customerId={item.customerId} />
        <Field
          label="Decisión"
          tooltip="Desenlace del caso de fraude. Queda auditado con tu usuario y no se deshace desde aquí."
        >
          <FormSelect
            control={control}
            name="decision"
            options={FRAUD_DECISIONS}
          />
        </Field>
        <Field
          label="Código de motivo"
          tooltip="Código corto que resume por qué decides así; alimenta los informes. Ej.: device_reuse_across_identities"
          error={errors.reasonCode?.message}
          hint={
            reasonRequired
              ? "Obligatorio para fraude confirmado o bloqueo."
              : "Opcional."
          }
        >
          <Textarea className="min-h-9" {...register("reasonCode")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-atlas-text">
          <input type="checkbox" {...register("applyWatchlist")} />
          Aplicar watchlist (marca teléfono/email hasheados del cliente real)
        </label>
        <Field
          label="Notas (opcional)"
          tooltip="Contexto para quien revise el caso después. No pegues datos personales del cliente."
        >
          <Textarea className="min-h-20" {...register("notes")} />
        </Field>
        <Field
          label="Próximo estado del cliente (opcional)"
          tooltip="En qué estado queda el cliente al cerrar el caso; déjalo en «Sin cambio» si no debe moverse."
        >
          <FormSelect
            control={control}
            name="nextCustomerStatus"
            options={[NO_STATUS_CHANGE, ...nextStatusOptions]}
          />
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
            {decide.data.decision}&quot;
            {decide.data.watchlistApplied ? " · watchlist aplicada" : ""}.
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
