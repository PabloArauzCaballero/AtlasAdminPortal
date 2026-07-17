"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useSubmitCatalogVersionMutation } from "./hooks";
import {
  submitCatalogVersionFormSchema,
  type SubmitCatalogVersionForm,
} from "./catalog-version-schema";

/**
 * Envío a aprobación. La nota es un campo real y obligatorio (mín. 3, tope del
 * backend): es lo que queda como `decisionReason` del evento de aprobación, así
 * que la escribe el operador — la pantalla nunca la rellena por él.
 */
export function CatalogVersionSubmitDialog({
  catalogCode,
  versionId,
  onClose,
}: Readonly<{
  catalogCode: string;
  versionId: string;
  onClose: () => void;
}>) {
  const submit = useSubmitCatalogVersionMutation(catalogCode, versionId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmitCatalogVersionForm>({
    resolver: zodResolver(submitCatalogVersionFormSchema),
    defaultValues: { notes: "" },
  });

  const onSubmit = handleSubmit((values) => {
    submit.mutate(values, { onSuccess: onClose });
  });

  return (
    <DrawerPanel open title="Enviar a aprobación" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="text-sm text-atlas-muted">
          La versión pasa a{" "}
          <span className="font-mono text-xs">pending_approval</span> y queda a
          la espera de la decisión de un administrador. Sigue sin afectar a
          ninguna regla en producción.
        </p>

        <Field
          label="Nota para quien aprueba"
          hint="Mín. 3 caracteres. Qué cambia esta versión y por qué — queda en el registro de aprobación."
          error={errors.notes?.message}
        >
          <Textarea rows={5} {...register("notes")} />
        </Field>

        {submit.error ? (
          <ErrorState
            title="No se pudo enviar a aprobación"
            description={
              isAtlasApiError(submit.error)
                ? submit.error.message
                : "Error inesperado al enviar la versión."
            }
            requestId={
              isAtlasApiError(submit.error) ? submit.error.requestId : undefined
            }
          />
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={submit.isPending}
            loadingText="Enviando…"
            disabled={submit.isPending}
          >
            Enviar a aprobación
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
