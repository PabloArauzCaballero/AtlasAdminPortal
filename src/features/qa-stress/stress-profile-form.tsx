"use client";

import { FormSelect } from "@/shared/components/ui/form-select";
import { endpointOption } from "@/features/systems/endpoint-options";
import { STRESS_PROFILE_STATUS_OPTIONS } from "@/features/qa-console/qa-options";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useAllEndpoints } from "@/features/systems/all-endpoints";
import { useUpsertStressProfileMutation } from "@/features/systems/stress-hooks";
import type { StressProfile } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import {
  emptyStressProfileForm,
  STRESS_ENVIRONMENTS,
  stressProfileSchema,
  toStressProfileForm,
  toUpsertInput,
  type StressProfileForm as StressProfileFormValues,
} from "./stress-profile-schema";

export function StressProfileForm({
  profile,
  onSaved,
}: Readonly<{
  /** Perfil a editar. Ausente = alta. */
  profile?: StressProfile;
  onSaved: (saved: StressProfile) => void;
}>) {
  const isEdit = Boolean(profile);
  const mutation = useUpsertStressProfileMutation();
  // Solo para elegir endpoint en el alta; al editar el endpoint ya viene fijado.
  const endpoints = useAllEndpoints();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StressProfileFormValues>({
    resolver: zodResolver(stressProfileSchema),
    defaultValues: profile
      ? toStressProfileForm(profile)
      : emptyStressProfileForm,
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(toUpsertInput(values), { onSuccess: onSaved });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field
          label="Endpoint objetivo"
          tooltip="Endpoint del catálogo que recibe la carga; no se cambia al editar el perfil."
          hint="El perfil aplica carga sobre este endpoint del catálogo."
          error={errors.endpointId?.message}
        >
          <FormSelect
            control={control}
            name="endpointId"
            disabled={isEdit}
            placeholder="Selecciona un endpoint…"
            options={(endpoints.data ?? []).map(endpointOption)}
          />
        </Field>

        <Field
          label={isEdit ? "Código (no editable)" : "Código (opcional)"}
          tooltip="Identificador único del perfil; vacío lo deriva del código del endpoint."
          hint={
            isEdit
              ? "El código identifica al perfil: cambiarlo no lo renombra, crearía otro perfil distinto."
              : "Vacío deriva STRESS_<código del endpoint>. Si ese perfil ya existe, se sobrescribe."
          }
          error={errors.code?.message}
        >
          <Input
            readOnly={isEdit}
            className={isEdit ? "bg-atlas-soft font-mono" : "font-mono"}
            placeholder="STRESS_LOGIN_PEAK"
            {...register("code")}
          />
        </Field>

        <Field
          label="Nombre"
          tooltip="Nombre legible del perfil que describe el escenario de carga."
          error={errors.name?.message}
        >
          <Input placeholder="Login — pico de mañana" {...register("name")} />
        </Field>

        <Field
          label="Estado"
          tooltip="Si el perfil se puede usar para encolar corridas o está apartado."
          error={errors.status?.message}
        >
          <FormSelect
            control={control}
            name="status"
            options={STRESS_PROFILE_STATUS_OPTIONS}
          />
        </Field>

        <Field
          label="RPS objetivo"
          tooltip="Peticiones por segundo que intenta sostener la corrida contra el endpoint."
          hint="Entre 1 y 10000."
          error={errors.targetRps?.message}
        >
          <Input
            type="number"
            min={1}
            max={10000}
            {...register("targetRps", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="Duración (segundos)"
          tooltip="Cuánto dura la carga sostenida; más tiempo detecta fugas de memoria."
          hint="Entre 5 y 86400."
          error={errors.durationSeconds?.message}
        >
          <Input
            type="number"
            min={5}
            max={86400}
            {...register("durationSeconds", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="Concurrencia"
          tooltip="Cuántas conexiones abiertas a la vez simulan usuarios simultáneos."
          hint="Entre 1 y 5000."
          error={errors.concurrency?.message}
        >
          <Input
            type="number"
            min={1}
            max={5000}
            {...register("concurrency", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="Error máximo aceptable (%)"
          tooltip="Porcentaje de respuestas fallidas a partir del cual la corrida se da por fallida."
          hint="Umbral de fallo del perfil. Se envía como fracción al backend."
          error={errors.maxErrorRatePercent?.message}
        >
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            {...register("maxErrorRatePercent", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="P95 máximo (ms)"
          tooltip="Latencia que el 95 % de las peticiones no debe superar para aprobar."
          hint="Entre 1 y 300000."
          error={errors.maxP95Ms?.message}
        >
          <Input
            type="number"
            min={1}
            max={300000}
            {...register("maxP95Ms", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Controller
        control={control}
        name="environmentScope"
        render={({ field }) => (
          <Field
            label="Ambientes habilitados"
            tooltip="Dónde se permite lanzar este perfil; producción queda bloqueada para carga real."
            hint="PRODUCTION_READONLY solo tiene efecto si la política interna lo permite; el backend bloquea stress real en producción."
            error={errors.environmentScope?.message}
          >
            <div className="flex flex-wrap gap-2">
              {STRESS_ENVIRONMENTS.map((scope) => (
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

      <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
        <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            {...register("isEnabled")}
          />
          <span>
            <strong>Perfil habilitado</strong>
            <span className="block text-xs text-atlas-muted">
              Deshabilitado sigue en el catálogo pero no se puede encolar.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            {...register("requiresApproval")}
          />
          <span>
            <strong>Requiere aprobación</strong>
            <span className="block text-xs text-atlas-muted">
              Exige ticket de aprobación al encolar una corrida.
            </span>
          </span>
        </label>
      </div>

      <Field
        label="Notas (opcional)"
        tooltip="Por qué existe el perfil y qué se espera medir con él."
        hint="Contexto para quien encuentre este perfil después: por qué existe y qué se espera medir."
        error={errors.notes?.message}
      >
        <Textarea rows={3} {...register("notes")} />
      </Field>

      {mutation.error ? (
        <ErrorState
          description={
            isAtlasApiError(mutation.error)
              ? mutation.error.message
              : "No se pudo guardar el perfil de stress."
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
        {isEdit ? "Guardar cambios" : "Crear perfil"}
      </Button>
    </form>
  );
}
