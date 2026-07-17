"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import {
  useCreateTestSuiteMutation,
  useUpdateTestSuiteMutation,
} from "@/features/systems/qa-authoring-hooks";
import type { TestSuite, TestSuiteDetail } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import {
  toSuiteForm,
  toSuiteInput,
  toSuiteUpdateInput,
} from "./suite-adapters";
import {
  emptySuiteForm,
  SUITE_ENVIRONMENTS,
  SUITE_TYPES,
  suiteSchema,
  type SuiteForm as SuiteFormValues,
} from "./suite-schema";

export function SuiteForm({
  suite,
  onSaved,
}: Readonly<{
  /** Suite a editar. Ausente = alta. */
  suite?: TestSuite;
  onSaved: (saved: TestSuiteDetail) => void;
}>) {
  const isEdit = Boolean(suite);
  const createMutation = useCreateTestSuiteMutation();
  const updateMutation = useUpdateTestSuiteMutation(suite?.suiteId ?? "");
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuiteFormValues>({
    resolver: zodResolver(suiteSchema),
    defaultValues: suite ? toSuiteForm(suite) : emptySuiteForm,
  });

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateMutation.mutate(toSuiteUpdateInput(values), { onSuccess: onSaved });
      return;
    }
    createMutation.mutate(toSuiteInput(values), { onSuccess: onSaved });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={isEdit ? "Código (no editable)" : "Código"}
          hint={
            isEdit
              ? "El código identifica la suite en el catálogo y no se renombra desde acá."
              : "Solo mayúsculas, números y guion bajo. Ej: SMOKE_LOGIN."
          }
          error={errors.code?.message}
        >
          <Input
            readOnly={isEdit}
            className={isEdit ? "bg-atlas-soft font-mono" : "font-mono"}
            placeholder="SMOKE_LOGIN"
            {...register("code")}
          />
        </Field>

        <Field label="Nombre" error={errors.name?.message}>
          <Input placeholder="Smoke — login interno" {...register("name")} />
        </Field>

        <Field
          label="Módulo"
          hint="Módulo del sistema que cubre la suite."
          error={errors.module?.message}
        >
          <Input placeholder="internal-auth" {...register("module")} />
        </Field>

        <Field label="Tipo de suite" error={errors.suiteType?.message}>
          <Select {...register("suiteType")}>
            {SUITE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Descripción (opcional)"
        hint="Qué cubre la suite y qué debería fallar si algo se rompe."
        error={errors.description?.message}
      >
        <Textarea rows={3} {...register("description")} />
      </Field>

      <Controller
        control={control}
        name="environmentScope"
        render={({ field }) => (
          <Field
            label="Ambientes"
            hint="Incluir PRODUCTION_READONLY exige marcar la suite como segura para producción."
            error={errors.environmentScope?.message}
          >
            <div className="flex flex-wrap gap-2">
              {SUITE_ENVIRONMENTS.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 rounded-lg border border-atlas-border px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={field.value.includes(scope)}
                    onChange={() =>
                      field.onChange(
                        field.value.includes(scope)
                          ? field.value.filter((value) => value !== scope)
                          : [...field.value, scope],
                      )
                    }
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              ))}
            </div>
          </Field>
        )}
      />

      <div className="grid gap-2 md:grid-cols-2">
        <SuiteToggle
          label="Habilitada"
          description="Deshabilitada queda en el catálogo pero no se ejecuta."
          field={register("isEnabled")}
        />
        <SuiteToggle
          label="Requiere seed data"
          description="La suite asume datos sembrados; sin ellos los pasos fallan."
          field={register("requiresSeedData")}
        />
        <SuiteToggle
          label="Segura para producción"
          description="Solo lectura y sin efectos secundarios. Requisito para PRODUCTION_READONLY."
          field={register("isSafeForProduction")}
        />
        <SuiteToggle
          label="Requiere permiso destructivo"
          description="La suite escribe o borra: exige permiso extra para ejecutarse."
          field={register("requiresDestructivePermission")}
        />
      </div>

      {mutation.error ? (
        <ErrorState
          description={
            isAtlasApiError(mutation.error)
              ? mutation.error.message
              : "No se pudo guardar la suite."
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
        {isEdit ? "Guardar cambios" : "Crear suite"}
      </Button>
    </form>
  );
}

/**
 * Recibe el resultado de `register()` como prop explícita en vez de spread.
 * `register` devuelve un `ref`, y aunque en React 19 el ref viaje como prop
 * normal, dejarlo implícito obliga a saberlo para entender por qué funciona:
 * pasándolo como `field` se ve que va directo al `<input>`.
 */
function SuiteToggle({
  label,
  description,
  field,
}: Readonly<{
  label: string;
  description: string;
  field: UseFormRegisterReturn;
}>) {
  return (
    <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
      <input type="checkbox" className="mt-0.5" {...field} />
      <span>
        <strong>{label}</strong>
        <span className="block text-xs text-atlas-muted">{description}</span>
      </span>
    </label>
  );
}
