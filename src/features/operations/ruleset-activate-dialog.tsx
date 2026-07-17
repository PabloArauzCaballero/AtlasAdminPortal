"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { toActivateRulesetInput } from "./catalog-version-adapters";
import { useActivateRulesetVersionMutation } from "./hooks";
import {
  activateRulesetFormSchema,
  emptyActivateRulesetForm,
  type ActivateRulesetForm,
} from "./risk-ruleset-schema";

/**
 * Activación de una versión de ruleset (solo admin/platform_admin en el backend).
 *
 * Es la acción más consecuente del módulo: cambia las reglas que deciden
 * aprobar o rechazar en producción. Por eso `activationReason` es obligatorio
 * (mín. 5, tope del backend) y lo escribe el operador, y la confirmación exige
 * teclear el código del ruleset.
 */
export function RulesetActivateDialog({
  rulesetVersionId,
  rulesetLabel,
  onClose,
}: Readonly<{
  rulesetVersionId: string;
  rulesetLabel: string;
  onClose: () => void;
}>) {
  const [pendingValues, setPendingValues] =
    useState<ActivateRulesetForm | null>(null);
  const activate = useActivateRulesetVersionMutation(rulesetVersionId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateRulesetForm>({
    resolver: zodResolver(activateRulesetFormSchema),
    defaultValues: emptyActivateRulesetForm,
  });

  function run(values: ActivateRulesetForm) {
    activate.mutate(toActivateRulesetInput(values), {
      onSuccess: () => {
        setPendingValues(null);
        onClose();
      },
    });
  }

  const onSubmit = handleSubmit((values) => setPendingValues(values));

  return (
    <>
      <DrawerPanel open title={`Activar ${rulesetLabel}`} onClose={onClose}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Activar esta versión cambia la política de riesgo que corre en
            producción: las decisiones de aprobación y rechazo pasan a evaluarse
            con estas reglas.
          </div>

          <Field
            label="Justificación de la activación"
            hint="Mín. 5 caracteres. Queda registrada junto con la activación."
            error={errors.activationReason?.message}
          >
            <Textarea rows={5} {...register("activationReason")} />
          </Field>

          <Field
            label="Vigente desde (opcional)"
            hint="Fecha y hora ISO 8601 (ej: 2026-07-17T10:30:00Z). Vacío = de inmediato."
            error={errors.effectiveFrom?.message}
          >
            <Input
              placeholder="2026-07-17T10:30:00Z"
              className="font-mono text-sm"
              {...register("effectiveFrom")}
            />
          </Field>

          {activate.error ? (
            <ErrorState
              title="No se pudo activar la versión"
              description={
                isAtlasApiError(activate.error)
                  ? activate.error.message
                  : "Error inesperado al activar la versión."
              }
              requestId={
                isAtlasApiError(activate.error)
                  ? activate.error.requestId
                  : undefined
              }
            />
          ) : null}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={activate.isPending}
              loadingText="Activando…"
              disabled={activate.isPending}
            >
              Activar versión
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DrawerPanel>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        title={`Activar ${rulesetLabel} en producción`}
        description="Las reglas de esta versión pasan a decidir aprobaciones y rechazos en vivo. La versión activa anterior deja de aplicarse."
        confirmText="Activar"
        isLoading={activate.isPending}
        typedConfirmationPhrase={rulesetLabel}
        onConfirm={() => {
          if (pendingValues) run(pendingValues);
        }}
        onCancel={() => setPendingValues(null)}
      />
    </>
  );
}
