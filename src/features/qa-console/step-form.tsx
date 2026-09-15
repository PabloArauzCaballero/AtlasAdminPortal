"use client";

import { FormSelect } from "@/shared/components/ui/form-select";
import { endpointOption } from "@/features/systems/endpoint-options";
import { HTTP_METHOD_OPTIONS, STEP_INPUT_MODE_OPTIONS } from "./qa-options";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  useCreateTestStepMutation,
  useUpdateTestStepMutation,
} from "@/features/systems/qa-authoring-hooks";
import { useAllEndpoints } from "@/features/systems/all-endpoints";
import type { TestStep } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { toStepForm, toStepInput } from "./suite-adapters";
import {
  emptyStepForm,
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
  const endpoints = useAllEndpoints();

  const {
    register,
    control,
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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field
          label="Nombre del paso"
          tooltip="Qué hace el paso en lenguaje llano; es lo que se lee en el informe de la corrida."
          error={errors.name?.message}
        >
          <Input
            placeholder="Login con credenciales válidas"
            {...register("name")}
          />
        </Field>

        <Field
          label="Orden"
          tooltip="Posición del paso dentro de la suite; los pasos se ejecutan de menor a mayor."
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

        <Field
          label="Método"
          tooltip="Verbo HTTP con el que se llama a la ruta; debe coincidir con el del endpoint."
          error={errors.method?.message}
        >
          <FormSelect
            control={control}
            name="method"
            options={HTTP_METHOD_OPTIONS}
          />
        </Field>

        <Field
          label="Modo de entrada"
          tooltip="De dónde salen los datos que envía el paso al ejecutarse."
          hint="FROM_PREVIOUS_STEP toma datos extraídos por el paso anterior."
          error={errors.inputMode?.message}
        >
          <FormSelect
            control={control}
            name="inputMode"
            options={STEP_INPUT_MODE_OPTIONS}
          />
        </Field>
      </div>

      <Field
        label="Ruta"
        tooltip="Ruta relativa a la base URL que llama el paso, con {variables} si hace falta."
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
        tooltip="Endpoint que prueba este paso; así cuenta en la cobertura de ese endpoint."
        hint="Asociarlo enlaza el paso con el catálogo y su cobertura. Vacío deja el paso suelto."
        error={errors.endpointId?.message}
      >
        <FormSelect
          control={control}
          name="endpointId"
          options={[
            {
              value: "",
              label: "Sin endpoint asociado",
              description:
                "El paso queda suelto y no suma cobertura a ningún endpoint.",
            },
            ...(endpoints.data ?? []).map(endpointOption),
          ]}
        />
      </Field>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <JsonField
          label="Assertions"
          tooltip="Condiciones que la respuesta debe cumplir para dar el paso por bueno."
          hint='Qué se valida de la respuesta. Ej: {"expectedStatusCodes": [200]}'
          error={errors.assertions?.message}
          field={register("assertions")}
        />
        <JsonField
          label="Extractors"
          tooltip="Valores de la respuesta que se guardan con nombre para los pasos siguientes."
          hint="Qué guardar de la respuesta para pasos siguientes."
          error={errors.extractors?.message}
          field={register("extractors")}
        />
        <JsonField
          label="Headers por defecto"
          tooltip="Cabeceras HTTP en JSON que acompañan a la petición. No pongas secretos."
          hint="Cabeceras que envía el paso."
          error={errors.defaultHeaders?.message}
          field={register("defaultHeaders")}
        />
        <JsonField
          label="Payload por defecto"
          tooltip="Cuerpo JSON que envía el paso si la corrida no lo sobrescribe."
          hint="Cuerpo que envía el paso."
          error={errors.defaultPayload?.message}
          field={register("defaultPayload")}
        />
      </div>

      <JsonField
        label="Config schema"
        tooltip="Qué parámetros pide el paso al ejecutar y de qué tipo son."
        hint="Parámetros configurables al ejecutar (solo con inputMode CONFIGURABLE)."
        error={errors.configSchema?.message}
        field={register("configSchema")}
      />

      <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
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
  tooltip,
  hint,
  error,
  field,
}: Readonly<{
  label: string;
  tooltip: string;
  hint: string;
  error?: string;
  field: UseFormRegisterReturn;
}>) {
  return (
    <Field label={label} tooltip={tooltip} hint={hint} error={error}>
      <Textarea rows={4} className="font-mono text-xs" {...field} />
    </Field>
  );
}
