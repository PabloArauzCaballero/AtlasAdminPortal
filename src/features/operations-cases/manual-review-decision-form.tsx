"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  MANUAL_REVIEW_DECISIONS,
  NEXT_STATUS_OPTIONS,
  NO_STATUS_CHANGE,
} from "./decision-options";
import {
  manualReviewDefaults,
  manualReviewSchema,
  toManualReviewInput,
  type ManualReviewForm,
} from "./decision-schemas";
import { useDecideManualReviewCaseMutation } from "./hooks";
import { AvisoDeExpediente } from "@/features/files/expediente-notice";
import type { WorkQueueItem } from "./types";
import Link from "next/link";
import { creditCaseHref } from "@/features/credit/credit-rules";

/*
 * Defensa: la cola ya no ofrece «Decidir» en un caso `CR-…`, pero si llega el 409 (una fila con
 * otra forma, o el backend cambia el criterio) se dice dónde se decide en vez del código crudo.
 */
function isCreditCaseError(error: unknown): boolean {
  return (
    isAtlasApiError(error) &&
    error.message.startsWith("MANUAL_REVIEW_ES_DE_CREDITO")
  );
}

function creditCaseMessage(message: string): string {
  if (message.startsWith("MANUAL_REVIEW_ES_DE_CREDITO"))
    return "Este caso es de una solicitud de crédito: se decide en la solicitud, que al resolverse cierra también el caso.";
  if (message.startsWith("MANUAL_REVIEW_ES_DE_IDENTIDAD"))
    return "Este caso es de identidad: se decide en el panel «Documentos de identidad» del expediente del cliente, que al resolverse cierra también el caso.";
  if (message.startsWith("MANUAL_REVIEW_DELEGADA_AL_MOTOR"))
    return "Este caso lo resuelve el Motor en su cola de revisión; su veredicto vuelve solo.";
  return message;
}

export function ManualReviewDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const decide = useDecideManualReviewCaseMutation();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ManualReviewForm>({
    resolver: zodResolver(manualReviewSchema),
    defaultValues: manualReviewDefaults,
  });

  const decision = watch("decision");
  const notesRequired =
    decision === "rejected" || decision === "request_more_information";

  const onSubmit = handleSubmit((values) => {
    decide.mutate({ caseId: item.caseId, body: toManualReviewInput(values) });
  });

  return (
    <DrawerPanel
      open
      title={`Decidir caso de revisión manual · #${item.caseId}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AvisoDeExpediente customerId={item.customerId} />
        <Field
          label="Decisión"
          tooltip="Desenlace de la revisión manual. Queda auditado con tu usuario y cierra el caso."
        >
          <FormSelect
            control={control}
            name="decision"
            options={MANUAL_REVIEW_DECISIONS}
          />
        </Field>
        <Field
          label="Código de motivo"
          tooltip="Código corto que resume por qué decides así; alimenta los informes de revisión."
          error={errors.reasonCode?.message}
        >
          <Textarea
            className="min-h-9"
            placeholder="Ej: identity_verified, insufficient_documents"
            {...register("reasonCode")}
          />
        </Field>
        <Field
          label="Notas"
          tooltip="Contexto de la decisión para auditoría. Obligatorio al rechazar o pedir información."
          error={errors.notes?.message}
          hint={
            notesRequired
              ? "Obligatorio: hay que dejar notas al rechazar o pedir más información."
              : "Opcional."
          }
        >
          <Textarea className="min-h-20" {...register("notes")} />
        </Field>
        <Field
          label="Próximo estado del cliente (opcional)"
          tooltip="En qué estado queda el cliente al cerrar el caso; déjalo en «Sin cambio» si no debe moverse."
        >
          <FormSelect
            control={control}
            name="nextCustomerStatus"
            options={[NO_STATUS_CHANGE, ...NEXT_STATUS_OPTIONS]}
          />
        </Field>
        {decide.error ? (
          <ErrorState
            title="No se pudo registrar la decisión"
            description={
              isAtlasApiError(decide.error)
                ? creditCaseMessage(decide.error.message)
                : "Error inesperado."
            }
            requestId={
              isAtlasApiError(decide.error) ? decide.error.requestId : undefined
            }
          />
        ) : null}
        {isCreditCaseError(decide.error) && creditCaseHref(item) ? (
          <Link
            href={creditCaseHref(item) ?? "#"}
            className="text-sm text-atlas-accent underline"
          >
            Abrir la solicitud de crédito para decidirla
          </Link>
        ) : null}
        {decide.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Caso #{decide.data.caseId} cerrado con decisión &quot;
            {decide.data.decision}&quot;.
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={decide.isPending}
            loadingText="Guardando…"
            disabled={decide.isPending}
          >
            Registrar decisión
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
