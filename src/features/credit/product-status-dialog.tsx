"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { PRODUCT_STATUS_REASONS, productStatusLabel } from "./credit-options";
import { creditErrorMessage } from "./credit-rules";
import { productStatusSchema, type ProductStatusForm } from "./credit-schemas";
import type { CreditProductStatus } from "./types";

/** Qué pasa, dicho antes de confirmar: el cambio de estado es inmediato para los clientes. */
const CONSEQUENCE: Record<CreditProductStatus, string> = {
  active:
    "Desde que confirmes, los clientes habilitados verán este producto y podrán solicitarlo.",
  suspended:
    "Los clientes dejarán de verlo al instante. Las solicitudes ya enviadas siguen su curso.",
  retired:
    "Sale del catálogo de forma definitiva. Las solicitudes ya enviadas siguen su curso.",
  draft:
    "Vuelve a borrador y deja de ofrecerse hasta que alguien lo active de nuevo.",
};

export function ProductStatusDialog({
  productName,
  to,
  isLoading,
  error,
  onCancel,
  onSubmit,
}: Readonly<{
  productName: string;
  to: CreditProductStatus;
  isLoading: boolean;
  error?: unknown;
  onCancel: () => void;
  onSubmit: (values: ProductStatusForm) => void;
}>) {
  const titleId = useId();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductStatusForm>({
    resolver: zodResolver(productStatusSchema),
    defaultValues: { status: to, reasonCode: "" },
  });
  const title = `${productStatusLabel(to)}: ${productName}`;

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-lg rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        <SectionHeader
          title={title}
          description="Queda en la auditoría operativa: quién, cuándo, de qué estado a cuál y el motivo."
        />
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {CONSEQUENCE[to]}
        </p>
        <Field
          label="Motivo"
          required
          tooltip="Por qué cambia el producto de estado; queda registrado en la auditoría operativa junto a quién lo cambió y el estado anterior."
          error={errors.reasonCode?.message}
        >
          <FormSelect
            control={control}
            name="reasonCode"
            options={PRODUCT_STATUS_REASONS}
            placeholder="Elige un motivo"
          />
        </Field>
        {error ? (
          <div className="mt-4">
            <ErrorState
              title="No se cambió el estado."
              description={creditErrorMessage(
                error,
                "No se pudo cambiar el estado del producto.",
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
            variant={to === "retired" ? "danger" : "primary"}
            isLoading={isLoading}
            loadingText="Guardando…"
          >
            {`Confirmar: ${productStatusLabel(to).toLowerCase()}`}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
