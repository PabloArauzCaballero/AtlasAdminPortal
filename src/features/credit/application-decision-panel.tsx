"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ExternalLink, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { engineExecutionUrl } from "@/shared/decision-engine/engine-links";
import { DECISION_OPTIONS, DECISION_REASONS } from "./credit-options";
import { creditErrorMessage, decisionAvailability } from "./credit-rules";
import {
  decisionFormSchema,
  withoutBlank,
  type DecisionForm,
} from "./credit-schemas";
import { useDecideCreditApplicationMutation } from "./hooks";
import type { CreditApplication, CreditDecisionBody } from "./types";

const CONFIRM_COPY: Record<DecisionForm["decision"], string> = {
  approve:
    "La solicitud queda aprobada y el cliente puede seguir al desembolso. No se puede deshacer desde el portal.",
  reject:
    "La solicitud queda rechazada y se cierra. El cliente verá el motivo. No se puede deshacer desde el portal.",
  request_more_information:
    "La solicitud sigue en revisión a la espera de lo que pidas en la nota.",
};

export function ApplicationDecisionPanel({
  application,
}: Readonly<{ application: CreditApplication }>) {
  const availability = decisionAvailability(application);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={Gavel}
          title="Decisión humana"
          description="Aprobar, rechazar o pedir más información. Estado e historial se escriben juntos, y si la solicitud tenía caso en la cola de trabajo, se cierra con ella."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {availability.kind === "closed" ? (
          <p className="text-sm text-atlas-muted">
            La solicitud ya está resuelta; no admite otra decisión.
          </p>
        ) : null}
        {availability.kind === "engine" ? (
          <EngineOwned executionId={availability.executionId} />
        ) : null}
        {availability.kind === "decide" ? (
          <DecisionForm application={application} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function EngineOwned({
  executionId,
}: Readonly<{ executionId: string | null }>) {
  const href = engineExecutionUrl(executionId);
  return (
    <div className="space-y-2 text-sm text-atlas-text">
      <p>
        Esta revisión la abrió el Motor de decisiones y se resuelve en su
        bandeja, con su expediente. Decidirla aquí crearía dos decisiones sobre
        la misma solicitud.
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-atlas-accent underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Abrir la ejecución en el Motor
        </a>
      ) : (
        <p className="font-mono text-xs text-atlas-muted">
          Ejecución {executionId ?? "—"}
        </p>
      )}
    </div>
  );
}

function DecisionForm({
  application,
}: Readonly<{ application: CreditApplication }>) {
  const mutation = useDecideCreditApplicationMutation();
  const [pending, setPending] = useState<CreditDecisionBody | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DecisionForm>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: { decision: "approve", reasonCode: "", notes: "" },
  });
  const decision = useWatch({ control, name: "decision" });
  const label =
    DECISION_OPTIONS.find((option) => option.value === decision)?.label ??
    "Decidir";

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
          setPending(withoutBlank(values) as CreditDecisionBody),
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Decisión"
            required
            tooltip="Qué pasa con la solicitud: aprobarla, rechazarla o dejarla en revisión."
            error={errors.decision?.message}
          >
            <FormSelect
              control={control}
              name="decision"
              options={DECISION_OPTIONS}
            />
          </Field>
          <Field
            label="Motivo"
            required
            tooltip="Motivo codificado de la decisión; el cliente tiene derecho a conocerlo."
            error={errors.reasonCode?.message}
          >
            <FormSelect
              control={control}
              name="reasonCode"
              options={DECISION_REASONS}
              placeholder="Elige un motivo"
            />
          </Field>
        </div>
        <Field
          label={decision === "approve" ? "Nota (opcional)" : "Nota"}
          required={decision !== "approve"}
          tooltip="Qué viste en el expediente para decidir así; queda en el historial de la solicitud."
          hint="Sin datos personales: número de carnet, teléfonos o cuentas no van aquí."
          error={errors.notes?.message}
        >
          <Textarea {...register("notes")} />
        </Field>
        {mutation.error ? (
          <ErrorState
            title="No se registró la decisión."
            description={creditErrorMessage(
              mutation.error,
              "No se pudo registrar la decisión.",
            )}
          />
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" variant="primary">
            {label}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pending !== null}
        title={`${label}: solicitud ${application.applicationCode}`}
        description={pending ? CONFIRM_COPY[pending.decision] : ""}
        confirmText={label}
        isLoading={mutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          mutation.mutate(
            { applicationId: application.id, body: pending },
            {
              onSuccess: () =>
                setDone("Decisión registrada. La solicitud se actualizó."),
              onSettled: () => setPending(null),
            },
          );
        }}
      />
    </>
  );
}
