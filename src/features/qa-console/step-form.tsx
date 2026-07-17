"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  useCreateTestStepMutation,
  useUpdateTestStepMutation,
} from "@/features/systems/qa-authoring-hooks";
import { useEndpoints } from "@/features/systems/hooks";
import type { TestStep } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { toStepForm, toStepInput } from "./suite-adapters";
import {
  emptyStepForm,
  HTTP_METHODS,
  STEP_INPUT_MODES,
  stepSchema,
  type StepForm as StepFormValues,
} from "./suite-schema";

export function StepForm({
  suiteId,
  step,
  nextStepOrder,
  onSaved,
}: Readonly<{
  suiteId: string;
  /** Step a editar. Ausente = alta. */
  step?: TestStep;
  /** Orden sugerido para un step nuevo (último + 1). */
  nextStepOrder: number;
  onSaved: () => void;
}>) {
  const isEdit = Boolean(step);
  const createMutation = useCreateTestStepMutation(suiteId);
  const updateMutation = useUpdateTestStepMutation(suiteId);
  const mutation = isEdit ? updateMutation : createMutation;
  const endpoints = useEndpoints({ page: 1, limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepFormValues>({
    resolver: zodResolver(stepSchema),
    defaultValues: step ? toStepForm(step) : emptyStepForm(nextStepOrder),
  });

  const onSubmit = handleSubmit((values) => {
    const body = toStepInput(values);
    if (isEdit && step) {
      updateMutation.mutate(
        { stepId: step.stepId, body },
        { onSuccess: onSaved },
      );
      return;
    }
    createMutation.mutate(body, { onSuccess: onSaved });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre del paso" error={errors.name?.message}>
          <Input
            placeholder="Login con credenciales válidas"
            {...register("name")}
          />
        </Field>

        <Field
          label="Orden"
          hint="Entre 1 y 500. Debe ser único dentro de la suite."
          error={errors.stepOrder?.message}
        >
          <Input
            type="number"
            min={1}
            max={500}
            {...register("stepOrder", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Método" error={errors.method?.message}>
          <Select {...register("method")}>
            {HTTP_METHODS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Modo de entrada"
          hint="FROM_PREVIOUS_STEP toma datos extraídos por el paso anterior."
          error={errors.inputMode?.message}
        >
          <Select {...register("inputMode")}>
            {STEP_INPUT_MODES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Ruta"
        hint="Debe empezar con una sola barra. Admite plantillas: /api/v1/customers/{customerId}"
        error={errors.pathTemplate?.message}
      >
        <Input
          className="font-mono"
          placeholder="/api/v1/…"
          {...register("pathTemplate")}
        />
      </Field>

      <Field
        label="Endpoint del catálogo (opcional)"
        hint="Asociarlo enlaza el paso con el catálogo y su cobertura. Vacío deja el paso suelto."
        error={errors.endpointId?.message}
      >
        <Select {...register("endpointId")}>
          <option value="">Sin endpoint asociado</option>
          {(endpoints.data?.items ?? []).map((endpoint) => (
            <option key={endpoint.endpointId} value={endpoint.endpointId}>
              {endpoint.method} {endpoint.fullPath}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <JsonField
          label="Assertions"
          hint='Qué se valida de la respuesta. Ej: {"expectedStatusCodes": [200]}'
          error={errors.assertions?.message}
          field={register("assertions")}
        />
        <JsonField
          label="Extractors"
          hint="Qué guardar de la respuesta para pasos siguientes."
          error={errors.extractors?.message}
          field={register("extractors")}
        />
        <JsonField
          label="Headers por defecto"
          hint="Cabeceras que envía el paso."
          error={errors.defaultHeaders?.message}
          field={register("defaultHeaders")}
        />
        <JsonField
          label="Payload por defecto"
          hint="Cuerpo que envía el paso."
          error={errors.defaultPayload?.message}
          field={register("defaultPayload")}
        />
      </div>

      <JsonField
        label="Config schema"
        hint="Parámetros configurables al ejecutar (solo con inputMode CONFIGURABLE)."
        error={errors.configSchema?.message}
        field={register("configSchema")}
      />

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            {...register("continueOnFailure")}
          />
          <span>
            <strong>Continuar si falla</strong>
            <span className="block text-xs text-atlas-muted">
              La suite sigue con los pasos siguientes aunque este falle.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            {...register("cleanupRequired")}
          />
          <span>
            <strong>Requiere limpieza</strong>
            <span className="block text-xs text-atlas-muted">
              El paso deja datos que hay que revertir al terminar.
            </span>
          </span>
        </label>
      </div>

      {mutation.error ? (
        <ErrorState
          description={
            isAtlasApiError(mutation.error)
              ? mutation.error.message
              : "No se pudo guardar el paso."
          }
          requestId={
            isAtlasApiError(mutation.error)
              ? mutation.error.requestId
              : undefined
          }
        />
      ) : null}

      <Button
        type="submit"
        variant="primary"
        isLoading={mutation.isPending}
        loadingText="Guardando…"
        disabled={mutation.isPending}
      >
        {isEdit ? "Guardar paso" : "Agregar paso"}
      </Button>
    </form>
  );
}

function JsonField({
  label,
  hint,
  error,
  field,
}: Readonly<{
  label: string;
  hint: string;
  error?: string;
  field: UseFormRegisterReturn;
}>) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Textarea rows={4} className="font-mono text-xs" {...field} />
    </Field>
  );
}
