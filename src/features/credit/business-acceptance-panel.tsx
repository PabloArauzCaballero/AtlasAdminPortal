"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Handshake } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { AcceptanceBadge } from "./credit-badges";
import { ACCEPTANCE_OPTIONS, ACCEPTANCE_REASONS } from "./credit-options";
import { acceptanceIsPending, creditErrorMessage } from "./credit-rules";
import {
  acceptanceFormSchema,
  withoutBlank,
  type AcceptanceForm,
} from "./credit-schemas";
import { useBusinessAcceptanceMutation } from "./hooks";
import type { BusinessAcceptanceBody, CreditApplication } from "./types";

/** Del formulario al cuerpo: `accepted` booleano y sin cadenas vacías (el backend es estricto). */
export function toAcceptanceBody(form: AcceptanceForm): BusinessAcceptanceBody {
  const rest = withoutBlank({ reasonCode: form.reasonCode, notes: form.notes });
  return { accepted: form.choice === "accept", ...rest };
}

export function BusinessAcceptancePanel({
  application,
}: Readonly<{ application: CreditApplication }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Handshake}
          title="Aceptación del negocio"
          description="El motor dijo que el riesgo encaja; el negocio dice si quiere la operación. Aquí se registra cuando el comercio no responde."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {acceptanceIsPending(application) ? (
          <AcceptanceForm application={application} />
        ) : (
          <div className="space-y-1 text-sm">
            <AcceptanceBadge value={application.businessAcceptance} />
            {application.businessAcceptanceAt ? (
              <p className="text-atlas-muted">
                {formatDateTime(application.businessAcceptanceAt)} ·{" "}
                {safeText(application.businessAcceptanceBy)}
                {application.businessAcceptanceReasonCode
                  ? ` · ${application.businessAcceptanceReasonCode}`
                  : ""}
              </p>
            ) : (
              <p className="text-atlas-muted">
                Sólo aplica a solicitudes que el motor aprobó y que esperan la
                respuesta del negocio.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AcceptanceForm({
  application,
}: Readonly<{ application: CreditApplication }>) {
  const mutation = useBusinessAcceptanceMutation();
  const [pending, setPending] = useState<BusinessAcceptanceBody | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptanceForm>({
    resolver: zodResolver(acceptanceFormSchema),
    defaultValues: { choice: "accept", reasonCode: "", notes: "" },
  });
  const choice = useWatch({ control, name: "choice" });
  const accept = choice === "accept";

  if (done)
    return (
      <p role="status" className="text-sm text-emerald-700">
        {done}
      </p>
    );

  return (
    <>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          setPending(toAcceptanceBody(values)),
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Respuesta del negocio"
            required
            tooltip="Si el negocio quiere o no esta venta que el motor ya aprobó."
            error={errors.choice?.message}
          >
            <FormSelect
              control={control}
              name="choice"
              options={ACCEPTANCE_OPTIONS}
            />
          </Field>
          <Field
            label={accept ? "Motivo (opcional)" : "Motivo"}
            required={!accept}
            tooltip="Por qué el negocio declina; aceptar no lo necesita porque el motivo lo dio el motor."
            error={errors.reasonCode?.message}
          >
            <FormSelect
              control={control}
              name="reasonCode"
              options={ACCEPTANCE_REASONS}
              placeholder="Elige un motivo"
            />
          </Field>
        </div>
        <Field
          label="Nota (opcional)"
          tooltip="Contexto de la respuesta, p. ej. con quién del comercio se habló."
          error={errors.notes?.message}
        >
          <Textarea className="min-h-20" {...register("notes")} />
        </Field>
        {mutation.error ? (
          <ErrorState
            title="No se registró la respuesta."
            description={creditErrorMessage(
              mutation.error,
              "No se pudo registrar la aceptación del negocio.",
            )}
          />
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" variant={accept ? "primary" : "danger"}>
            {accept ? "Aceptar la operación" : "Declinar la operación"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.accepted
            ? `Aceptar la operación ${application.applicationCode}`
            : `Declinar la operación ${application.applicationCode}`
        }
        description={
          pending?.accepted
            ? "El cliente queda habilitado para pagar el inicial y seguir al desembolso."
            : "La solicitud queda rechazada aunque el motor la aprobó. No se puede deshacer desde el portal."
        }
        confirmText={pending?.accepted ? "Aceptar" : "Declinar"}
        isLoading={mutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          mutation.mutate(
            { applicationId: application.id, body: pending },
            {
              onSuccess: () => setDone("Respuesta del negocio registrada."),
              onSettled: () => setPending(null),
            },
          );
        }}
      />
    </>
  );
}
