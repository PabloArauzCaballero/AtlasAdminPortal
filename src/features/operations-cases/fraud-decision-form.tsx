"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  FRAUD_DECISIONS,
  FRAUD_NEXT_STATUS_VALUES,
  NEXT_STATUS_OPTIONS,
} from "./decision-options";
import {
  fraudDefaults,
  fraudSchema,
  toFraudInput,
  type FraudForm,
} from "./decision-schemas";
import { useDecideFraudCaseMutation } from "./hooks";
import type { WorkQueueItem } from "./types";

export function FraudDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const decide = useDecideFraudCaseMutation();
  const {
    register,
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
        <Field label="Decisión">
          <Select {...register("decision")}>
            {FRAUD_DECISIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Código de motivo"
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
        <Field label="Notas (opcional)">
          <Textarea className="min-h-20" {...register("notes")} />
        </Field>
        <Field label="Próximo estado del cliente (opcional)">
          <Select {...register("nextCustomerStatus")}>
            <option value="">Sin cambio</option>
            {nextStatusOptions.map((option) => (
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
