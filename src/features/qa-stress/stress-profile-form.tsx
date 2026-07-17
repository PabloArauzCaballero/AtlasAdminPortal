"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEndpoints } from "@/features/systems/hooks";
import { useUpsertStressProfileMutation } from "@/features/systems/stress-hooks";
import type { StressProfile } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import {
  emptyStressProfileForm,
  STRESS_ENVIRONMENTS,
  STRESS_PROFILE_STATUSES,
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
  const endpoints = useEndpoints({ page: 1, limit: 200 });

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
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Endpoint objetivo"
          hint="El perfil aplica carga sobre este endpoint del catálogo."
          error={errors.endpointId?.message}
        >
          <Select disabled={isEdit} {...register("endpointId")}>
            <option value="">Selecciona un endpoint…</option>
            {(endpoints.data?.items ?? []).map((endpoint) => (
              <option key={endpoint.endpointId} value={endpoint.endpointId}>
                {endpoint.method} {endpoint.fullPath}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={isEdit ? "Código (no editable)" : "Código (opcional)"}
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

        <Field label="Nombre" error={errors.name?.message}>
          <Input placeholder="Login — pico de mañana" {...register("name")} />
        </Field>

        <Field label="Estado" error={errors.status?.message}>
          <Select {...register("status")}>
            {STRESS_PROFILE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="RPS objetivo"
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

      <div className="grid gap-2 md:grid-cols-2">
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
