"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Info } from "lucide-react";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import type { Option } from "@/shared/lib/options";
import {
  expiryToIso,
  revokeCardTierSchema,
  setCardTierSchema,
  type RevokeCardTierForm,
  type SetCardTierForm,
} from "./card-tier-schemas";
import type {
  CardTierDefinition,
  RevokeCardTierBody,
  SetCardTierBody,
} from "./card-tier-types";
import { cardTierErrorMessage } from "./card-tier-errors";

const PANEL =
  "w-full max-w-lg rounded-xl border border-atlas-border bg-white p-5 shadow-card";

type DialogProps<TBody> = Readonly<{
  customerLabel: string;
  isLoading: boolean;
  error?: unknown;
  onCancel: () => void;
  onSubmit: (body: TBody) => void;
}>;

/** Poner una tarjeta a mano: motivo obligatorio y vencimiento opcional. No toca el límite de crédito. */
export function SetCardTierDialog({
  catalog,
  currentCode,
  customerLabel,
  isLoading,
  error,
  onCancel,
  onSubmit,
}: DialogProps<SetCardTierBody> &
  Readonly<{ catalog: CardTierDefinition[]; currentCode: string }>) {
  const titleId = useId();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetCardTierForm>({
    resolver: zodResolver(setCardTierSchema),
    defaultValues: { tierCode: undefined, reason: "", expiresOn: "" },
  });
  const options: Option[] = catalog.map((tier) => ({
    value: tier.code,
    label: tier.code === currentCode ? `${tier.label} (la actual)` : tier.label,
    description: tier.description,
  }));

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName={PANEL}
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          onSubmit({
            tierCode: values.tierCode,
            reason: values.reason.trim(),
            expiresAt: expiryToIso(values.expiresOn),
          }),
        )}
      >
        <h2 id={titleId} className="sr-only">
          {`Cambiar la tarjeta de ${customerLabel}`}
        </h2>
        <SectionHeader
          title={`Cambiar la tarjeta de ${customerLabel}`}
          description="Queda en la auditoría operativa y en el historial de la tarjeta: quién, cuándo y por qué."
        />
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          La tarjeta es presentación y estatus: no cambia su límite de crédito.
          Al vencer o quitarse el ajuste, vuelve a la que le corresponde por su
          nivel.
        </p>
        <div className="space-y-4">
          <Field
            label="Tarjeta"
            required
            tooltip="La tarjeta que verá el cliente en la app. Reemplaza el ajuste manual anterior, si había uno."
            error={errors.tierCode?.message}
          >
            <FormSelect
              control={control}
              name="tierCode"
              options={options}
              placeholder="Elige una tarjeta"
            />
          </Field>
          <Field
            label="Motivo"
            required
            tooltip="Por qué se le pone esta tarjeta (por ejemplo: «Cliente fundador de la red»). Mínimo 10 caracteres; queda en el historial y NO lo ve el cliente."
            error={errors.reason?.message}
          >
            <Textarea
              rows={3}
              maxLength={500}
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
          </Field>
          <Field
            label="Vence el"
            tooltip="Opcional. Sin fecha, el ajuste dura hasta que alguien lo quite. Con fecha, el último día completo es ése."
            error={errors.expiresOn?.message}
          >
            <Input type="date" {...register("expiresOn")} />
          </Field>
        </div>
        {error ? (
          <div className="mt-4">
            <ErrorState
              title="No se cambió la tarjeta."
              description={cardTierErrorMessage(
                error,
                "No se pudo cambiar la tarjeta del cliente.",
              )}
            />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Guardando…">
            Confirmar cambio
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

/** Quitar el ajuste manual: el cliente vuelve a la tarjeta de su nivel. */
export function RevokeCardTierDialog({
  automaticLabel,
  customerLabel,
  isLoading,
  error,
  onCancel,
  onSubmit,
}: DialogProps<RevokeCardTierBody> & Readonly<{ automaticLabel: string }>) {
  const titleId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RevokeCardTierForm>({
    resolver: zodResolver(revokeCardTierSchema),
    defaultValues: { reason: "" },
  });

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName={PANEL}
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          onSubmit({ reason: values.reason.trim() }),
        )}
      >
        <h2 id={titleId} className="sr-only">
          {`Quitar el ajuste de ${customerLabel}`}
        </h2>
        <SectionHeader
          title={`Quitar el ajuste de ${customerLabel}`}
          description={`Vuelve a la tarjeta que le corresponde por su nivel: ${automaticLabel}.`}
        />
        <Field
          label="Motivo"
          required
          tooltip="Por qué se quita el ajuste manual. Mínimo 10 caracteres; queda en el historial y NO lo ve el cliente."
          error={errors.reason?.message}
        >
          <Textarea
            rows={3}
            maxLength={500}
            aria-invalid={Boolean(errors.reason)}
            {...register("reason")}
          />
        </Field>
        {error ? (
          <div className="mt-4">
            <ErrorState
              title="No se quitó el ajuste."
              description={cardTierErrorMessage(
                error,
                "No se pudo quitar el ajuste de la tarjeta.",
              )}
            />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isLoading}
            loadingText="Guardando…"
          >
            Quitar ajuste
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
