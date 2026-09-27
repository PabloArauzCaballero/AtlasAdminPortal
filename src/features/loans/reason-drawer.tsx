"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useState } from "react";
import { useReversePaymentMutation, useWriteOffMutation } from "./hooks";
import {
  REVERSAL_REASON_OPTIONS,
  WRITE_OFF_REASON_OPTIONS,
  reversalFormSchema,
  toReversalInput,
  toWriteOffInput,
  writeOffFormSchema,
  type ReversalForm,
} from "./loan-forms";
import { explicarErrorDeCartera } from "./loan-labels";
import { Importe } from "./loan-ui";
import type { LoanDetail, LoanPayment } from "./types";

/**
 * Reversar un cobro y castigar un préstamo comparten forma: un motivo obligatorio, unas notas y
 * una segunda confirmación, porque ninguno de los dos se deshace desde el portal. Cambian el
 * texto, la regla de las notas (el castigo las exige) y la llamada.
 */
type Accion = {
  titulo: string;
  aviso: React.ReactNode;
  motivos: typeof REVERSAL_REASON_OPTIONS;
  notasObligatorias: boolean;
  confirmar: { titulo: string; texto: string; boton: string; frase?: string };
  exito: string;
  mutation: {
    mutate: (values: ReversalForm, opts: { onSettled: () => void }) => void;
    isPending: boolean;
    isSuccess: boolean;
    error: unknown;
  };
};

function ReasonDrawer({
  accion,
  onClose,
}: Readonly<{ accion: Accion; onClose: () => void }>) {
  const [pendiente, setPendiente] = useState<ReversalForm | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReversalForm>({
    resolver: zodResolver(
      accion.notasObligatorias ? writeOffFormSchema : reversalFormSchema,
    ),
    defaultValues: { reasonCode: "", notes: "" },
  });
  const { mutation } = accion;

  return (
    <DrawerPanel open title={accion.titulo} onClose={onClose}>
      <form
        onSubmit={handleSubmit(setPendiente)}
        noValidate
        className="space-y-4"
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {accion.aviso}
        </div>
        <Field
          label="Motivo"
          tooltip="Por qué se hace. Queda en el historial del préstamo y en los informes de cartera."
          error={errors.reasonCode?.message}
          required
        >
          <FormSelect
            control={control}
            name="reasonCode"
            options={accion.motivos}
          />
        </Field>
        <Field
          label={accion.notasObligatorias ? "Explicación" : "Notas (opcional)"}
          tooltip="Contexto para quien audite: qué se comprobó y con quién. No pegues datos personales del cliente."
          error={errors.notes?.message}
          required={accion.notasObligatorias}
        >
          <Textarea
            className="min-h-24"
            maxLength={2000}
            {...register("notes")}
          />
        </Field>
        {mutation.error ? (
          <ErrorState
            title="No se aplicó"
            description={explicarErrorDeCartera(
              mutation.error,
              "No se pudo completar la operación.",
            )}
            requestId={
              isAtlasApiError(mutation.error)
                ? mutation.error.requestId
                : undefined
            }
          />
        ) : null}
        {mutation.isSuccess ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {accion.exito}
          </div>
        ) : null}
        <div className="flex gap-2">
          {mutation.isSuccess ? null : (
            <Button
              type="submit"
              variant="danger"
              disabled={mutation.isPending}
            >
              {accion.confirmar.boton}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            {mutation.isSuccess ? "Cerrar" : "Cancelar"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pendiente !== null}
        title={accion.confirmar.titulo}
        description={accion.confirmar.texto}
        confirmText={accion.confirmar.boton}
        typedConfirmationPhrase={accion.confirmar.frase}
        isLoading={mutation.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          if (pendiente)
            mutation.mutate(pendiente, { onSettled: () => setPendiente(null) });
        }}
      />
    </DrawerPanel>
  );
}

export function ReversalDrawer({
  loanId,
  payment,
  onClose,
}: Readonly<{ loanId: string; payment: LoanPayment; onClose: () => void }>) {
  const reversar = useReversePaymentMutation(loanId);
  return (
    <ReasonDrawer
      onClose={onClose}
      accion={{
        titulo: `Reversar el cobro ${payment.paymentCode}`,
        aviso: (
          <>
            Se deshace la aplicación de{" "}
            <Importe value={payment.amount} currency={payment.currencyCode} />:
            las cuotas vuelven a deber lo que este cobro había pagado y, si el
            préstamo estaba pagado, vuelve a estar vigente.
          </>
        ),
        motivos: REVERSAL_REASON_OPTIONS,
        notasObligatorias: false,
        confirmar: {
          titulo: "¿Reversar este cobro?",
          texto:
            "El cobro queda anulado en el historial con tu usuario y el motivo. No se puede volver a aplicar: si fue un error, registra un cobro nuevo.",
          boton: "Reversar cobro",
        },
        exito: "Cobro reversado. El saldo del préstamo ya lo refleja.",
        mutation: {
          ...reversar,
          mutate: (values, opts) =>
            reversar.mutate(
              { paymentId: payment.paymentId, body: toReversalInput(values) },
              opts,
            ),
        },
      }}
    />
  );
}

export function WriteOffDrawer({
  loan,
  onClose,
}: Readonly<{ loan: LoanDetail; onClose: () => void }>) {
  const castigar = useWriteOffMutation(loan.loanId);
  return (
    <ReasonDrawer
      onClose={onClose}
      accion={{
        titulo: `Castigar el préstamo ${loan.loanCode}`,
        aviso: (
          <>
            Castigar reconoce como pérdida el capital pendiente (
            <Importe
              value={loan.outstandingPrincipal}
              currency={loan.currencyCode}
            />
            ). El préstamo no se borra: queda castigado, deja de admitir cobros
            y el importe pasa a la medida de riesgo que recibe el Motor.
          </>
        ),
        motivos: WRITE_OFF_REASON_OPTIONS,
        notasObligatorias: true,
        confirmar: {
          titulo: "¿Castigar este préstamo?",
          texto:
            "No se deshace desde el portal. Escribe el código del préstamo para confirmar.",
          boton: "Castigar préstamo",
          frase: loan.loanCode,
        },
        exito: "Préstamo castigado.",
        mutation: {
          ...castigar,
          mutate: (values, opts) =>
            castigar.mutate(toWriteOffInput(values), opts),
        },
      }}
    />
  );
}
