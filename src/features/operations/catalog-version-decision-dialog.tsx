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
import { toCatalogDecisionInput } from "./catalog-version-adapters";
import {
  DECISION_LABELS,
  requiresTypedConfirmation,
} from "./catalog-version-lifecycle";
import {
  catalogDecisionFormSchema,
  type CatalogDecision,
  type CatalogDecisionForm,
} from "./catalog-version-schema";
import { useDecideCatalogVersionMutation } from "./hooks";

const DECISION_INTENT: Record<CatalogDecision, string> = {
  approve:
    "La versión queda aprobada pero todavía no vigente: hay que publicarla para que las reglas la usen.",
  reject:
    "La versión queda rechazada de forma definitiva. Para retomar el cambio hay que crear una versión nueva.",
  publish:
    "La versión pasa a vigente: las reglas de negocio empiezan a leer este catálogo en producción.",
  retire:
    "La versión sale de servicio. Las reglas dejan de leerla y queda solo como historial.",
};

/**
 * Decisión de aprobación (solo admin/platform_admin en el backend).
 *
 * `decisionReason` es obligatorio (mín. 5, tope del backend) y lo escribe el
 * operador: es la justificación que queda en el evento de aprobación y en la
 * auditoría. `publish` y `retire` piden además doble confirmación tecleada
 * porque cambian lo que corre en producción.
 */
export function CatalogVersionDecisionDialog({
  catalogCode,
  versionId,
  versionCode,
  decision,
  onClose,
}: Readonly<{
  catalogCode: string;
  versionId: string;
  versionCode: string;
  decision: CatalogDecision;
  onClose: () => void;
}>) {
  const [pendingValues, setPendingValues] =
    useState<CatalogDecisionForm | null>(null);
  const decide = useDecideCatalogVersionMutation(catalogCode, versionId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CatalogDecisionForm>({
    resolver: zodResolver(catalogDecisionFormSchema),
    defaultValues: {
      decision,
      decisionReason: "",
      validFrom: "",
      validUntil: "",
    },
  });

  function run(values: CatalogDecisionForm) {
    decide.mutate(toCatalogDecisionInput(values), {
      onSuccess: () => {
        setPendingValues(null);
        onClose();
      },
    });
  }

  // La doble confirmación va después de validar el formulario: no tiene sentido
  // pedir que tecleen el código de la versión para después rebotar por la razón.
  const onSubmit = handleSubmit((values) => {
    if (requiresTypedConfirmation(decision)) {
      setPendingValues(values);
      return;
    }
    run(values);
  });

  return (
    <>
      <DrawerPanel
        open
        title={`${DECISION_LABELS[decision]} versión ${versionCode}`}
        onClose={onClose}
      >
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-atlas-muted">
            {DECISION_INTENT[decision]}
          </p>

          <Field
            label="Justificación de la decisión"
            hint="Mín. 5 caracteres. Queda en el registro de aprobación y en la auditoría."
            error={errors.decisionReason?.message}
          >
            <Textarea rows={5} {...register("decisionReason")} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Vigente desde (opcional)"
              hint="YYYY-MM-DD. Vacío mantiene la fecha de la versión."
              error={errors.validFrom?.message}
            >
              <Input
                type="date"
                className="font-mono"
                {...register("validFrom")}
              />
            </Field>
            <Field
              label="Vigente hasta (opcional)"
              hint="YYYY-MM-DD. Vacío mantiene la fecha de la versión."
              error={errors.validUntil?.message}
            >
              <Input
                type="date"
                className="font-mono"
                {...register("validUntil")}
              />
            </Field>
          </div>

          {decide.error ? (
            <ErrorState
              title="No se pudo registrar la decisión"
              description={
                isAtlasApiError(decide.error)
                  ? decide.error.message
                  : "Error inesperado al registrar la decisión."
              }
              requestId={
                isAtlasApiError(decide.error)
                  ? decide.error.requestId
                  : undefined
              }
            />
          ) : null}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={decide.isPending}
              loadingText="Registrando…"
              disabled={decide.isPending}
            >
              {DECISION_LABELS[decision]}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DrawerPanel>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        title={`${DECISION_LABELS[decision]} ${versionCode} en producción`}
        description={DECISION_INTENT[decision]}
        confirmText={DECISION_LABELS[decision]}
        isLoading={decide.isPending}
        typedConfirmationPhrase={versionCode}
        onConfirm={() => {
          if (pendingValues) run(pendingValues);
        }}
        onCancel={() => setPendingValues(null)}
      />
    </>
  );
}
