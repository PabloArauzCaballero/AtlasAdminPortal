"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { FormSelect } from "@/shared/components/ui/form-select";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { creditErrorMessage, isDuplicatedProductCode } from "./credit-rules";
import {
  productFormDefaults,
  productFormSchema,
  type ProductForm,
} from "./credit-schemas";

const REVIEW_OPTIONS = [
  {
    value: "no",
    label: "Según el motor",
    description:
      "El motor decide cada solicitud y sólo manda a una persona las dudosas.",
  },
  {
    value: "yes",
    label: "Siempre revisión humana",
    description:
      "Toda solicitud de este producto espera la decisión de un analista.",
  },
];

export function ProductCreateDialog({
  isLoading,
  error,
  onCancel,
  onSubmit,
}: Readonly<{
  isLoading: boolean;
  error?: unknown;
  onCancel: () => void;
  onSubmit: (values: ProductForm) => void;
}>) {
  const titleId = useId();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormDefaults,
  });

  // El código repetido es un error DEL CAMPO: se pinta junto al código y lo escrito se conserva.
  useEffect(() => {
    if (isDuplicatedProductCode(error))
      setError("productCode", {
        message: "Ya existe un producto con este código.",
      });
  }, [error, setError]);

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="atlas-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <h2 id={titleId} className="sr-only">
          Nuevo producto de crédito
        </h2>
        <SectionHeader
          title="Nuevo producto de crédito"
          description="Nace en borrador: nadie lo ve hasta que lo actives. Los montos, plazos y la tasa los decide el negocio, no el sistema."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Código"
            required
            tooltip="Identificador fijo del producto; en minúsculas, sin espacios, p. ej. consumo_12m."
            error={errors.productCode?.message}
          >
            <Input className="font-mono" {...register("productCode")} />
          </Field>
          <Field
            label="Nombre"
            required
            tooltip="Cómo lo verá el cliente en la app al elegir su crédito."
            error={errors.productName?.message}
          >
            <Input {...register("productName")} />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="Descripción (opcional)"
              tooltip="Para qué sirve el producto y a quién va dirigido, en pocas líneas."
              error={errors.description?.message}
            >
              <Textarea className="min-h-20" {...register("description")} />
            </Field>
          </div>
          <Field
            label="Moneda"
            required
            tooltip="Código ISO de tres letras de la moneda del préstamo, p. ej. BOB."
            error={errors.currencyCode?.message}
          >
            <Input
              className="font-mono uppercase"
              {...register("currencyCode")}
            />
          </Field>
          <Field
            label="Revisión de solicitudes"
            tooltip="Si toda solicitud debe esperar a un analista o sólo las que el motor marca."
            error={errors.requiresManualReview?.message}
          >
            <FormSelect
              control={control}
              name="requiresManualReview"
              options={REVIEW_OPTIONS}
            />
          </Field>
          <Field
            label="Monto mínimo"
            required
            tooltip="Lo mínimo que un cliente puede pedir con este producto."
            error={errors.minAmount?.message}
          >
            <Input inputMode="decimal" {...register("minAmount")} />
          </Field>
          <Field
            label="Monto máximo"
            required
            tooltip="Techo del producto: ninguna línea lo supera aunque el cliente pueda pagar más."
            error={errors.maxAmount?.message}
          >
            <Input inputMode="decimal" {...register("maxAmount")} />
          </Field>
          <Field
            label="Plazo mínimo (meses)"
            required
            tooltip="Menor número de cuotas mensuales que admite el producto."
            error={errors.minTermMonths?.message}
          >
            <Input inputMode="numeric" {...register("minTermMonths")} />
          </Field>
          <Field
            label="Plazo máximo (meses)"
            required
            tooltip="Mayor número de cuotas mensuales que admite el producto, hasta 360."
            error={errors.maxTermMonths?.message}
          >
            <Input inputMode="numeric" {...register("maxTermMonths")} />
          </Field>
          <Field
            label="Tasa anual % (opcional)"
            tooltip="Vacío deja que el motor fije la tasa según el riesgo de cada cliente."
            error={errors.annualInterestRate?.message}
          >
            <Input inputMode="decimal" {...register("annualInterestRate")} />
          </Field>
          <Field
            label="Ingreso mensual mínimo (opcional)"
            tooltip="Por debajo de este ingreso declarado el producto no se le ofrece al cliente."
            error={errors.minMonthlyIncome?.message}
          >
            <Input inputMode="decimal" {...register("minMonthlyIncome")} />
          </Field>
          <Field
            label="Vigente desde (opcional)"
            tooltip="Primer día en que se puede ofrecer una vez activo; vacío es desde que se active."
            error={errors.effectiveFrom?.message}
          >
            <Input type="date" {...register("effectiveFrom")} />
          </Field>
          <Field
            label="Vigente hasta (opcional)"
            tooltip="Último día en que se ofrece; vacío lo deja sin fecha de fin."
            error={errors.effectiveUntil?.message}
          >
            <Input type="date" {...register("effectiveUntil")} />
          </Field>
        </div>
        {error && !isDuplicatedProductCode(error) ? (
          <ErrorState
            title="No se creó el producto."
            description={creditErrorMessage(
              error,
              "No se pudo crear el producto. Lo que escribiste sigue aquí.",
            )}
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" disabled={isLoading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            loadingText="Creando…"
          >
            Crear en borrador
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
