"use client";

import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { newIdempotencyKey } from "@/shared/api/idempotency";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useRegisterPaymentMutation } from "./hooks";
import {
  paymentFormDefaults,
  paymentFormSchema,
  toPaymentInput,
  type PaymentForm,
} from "./loan-forms";
import { PAYMENT_METHOD_OPTIONS, explicarErrorDeCartera } from "./loan-labels";
import { Importe } from "./loan-ui";
import type { LoanDetail } from "./types";

/**
 * Registrar un cobro que ya ocurrió fuera (ventanilla, transferencia, QR).
 *
 * El servidor lo aplica con prelación mora → interés → capital sobre la cuota más antigua, y
 * rechaza un importe mayor que lo pendiente. La llave de idempotencia vive mientras el panel esté
 * abierto: si la red corta y se vuelve a pulsar, el servidor reconoce el mismo cobro y no lo
 * aplica dos veces.
 */
export function PaymentDrawer({
  loan,
  pendiente,
  onClose,
}: Readonly<{ loan: LoanDetail; pendiente: number; onClose: () => void }>) {
  const registrar = useRegisterPaymentMutation(loan.loanId);
  const llave = useRef(newIdempotencyKey());
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: paymentFormDefaults,
  });

  const onSubmit = handleSubmit((values) => {
    registrar.mutate(
      {
        body: toPaymentInput(values, loan.currencyCode),
        idempotencyKey: llave.current,
      },
      {
        onSuccess: () => {
          llave.current = newIdempotencyKey();
        },
      },
    );
  });

  return (
    <DrawerPanel
      open
      title={`Registrar un cobro · ${loan.loanCode}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="text-sm text-atlas-muted">
          Pendiente hoy:{" "}
          <strong className="text-atlas-text">
            <Importe value={pendiente} currency={loan.currencyCode} />
          </strong>
          . Se aplica primero a la mora, luego al interés y al final al capital,
          empezando por la cuota más antigua.
        </p>
        <Field
          label={`Importe (${loan.currencyCode})`}
          tooltip="Lo que el cliente pagó, con punto decimal y hasta dos decimales. Ej.: 350.50. No puede superar lo pendiente."
          error={errors.amount?.message}
          required
        >
          <Input
            inputMode="decimal"
            className="tabular-nums"
            {...register("amount")}
          />
        </Field>
        <Field
          label="Medio de pago"
          tooltip="Por dónde entró el dinero. Sirve para conciliar con el banco o la caja."
          error={errors.paymentMethod?.message}
          required
        >
          <FormSelect
            control={control}
            name="paymentMethod"
            options={PAYMENT_METHOD_OPTIONS}
          />
        </Field>
        <Field
          label="Referencia externa (opcional)"
          tooltip="El número que identifica el pago fuera de Atlas: el de la transferencia, el del recibo de caja o el del QR."
          error={errors.externalReference?.message}
        >
          <Input {...register("externalReference")} />
        </Field>
        {registrar.error ? (
          <ErrorState
            title="El cobro no se registró"
            description={explicarErrorDeCartera(
              registrar.error,
              "No se pudo registrar el cobro. Vuelve a intentarlo: no se duplicará.",
            )}
            requestId={
              isAtlasApiError(registrar.error)
                ? registrar.error.requestId
                : undefined
            }
          />
        ) : null}
        {registrar.data ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {registrar.data.duplicated
              ? `Ese cobro ya estaba registrado (${registrar.data.paymentCode}); no se aplicó otra vez.`
              : `Cobro ${registrar.data.paymentCode} aplicado.`}
          </div>
        ) : null}
        <div className="flex gap-2">
          {registrar.isSuccess ? null : (
            <Button
              type="submit"
              variant="primary"
              isLoading={registrar.isPending}
              loadingText="Registrando…"
              disabled={registrar.isPending}
            >
              Registrar cobro
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            {registrar.isSuccess ? "Cerrar" : "Cancelar"}
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
