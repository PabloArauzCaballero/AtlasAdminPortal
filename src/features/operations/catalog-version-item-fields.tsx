"use client";

import { useFormContext } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { AliasRows, RiskMappingRows } from "./catalog-version-nested-rows";
import type { CreateCatalogVersionForm } from "./catalog-version-schema";

/** Un item de la versión: campos propios más sus alias y mapeos de riesgo. */
export function CatalogVersionItemFields({
  index,
  onRemove,
}: Readonly<{ index: number; onRemove?: () => void }>) {
  const { register, formState } = useFormContext<CreateCatalogVersionForm>();
  const errors = formState.errors.items?.[index];

  return (
    <div className="space-y-4 rounded-xl border border-atlas-border bg-slate-50/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-atlas-text">
          Item #{index + 1}
        </p>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRemove}
          >
            Quitar item
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Código"
          hint="Solo letras, números y _ . : - (2 a 140)."
          error={errors?.itemCode?.message}
        >
          <Input
            placeholder="bnb"
            className="font-mono text-sm"
            {...register(`items.${index}.itemCode`)}
          />
        </Field>
        <Field label="Nombre" error={errors?.itemName?.message}>
          <Input
            placeholder="Banco Nacional de Bolivia"
            {...register(`items.${index}.itemName`)}
          />
        </Field>
        <Field
          label="Tipo"
          hint="Categoría del item dentro del catálogo."
          error={errors?.itemType?.message}
        >
          <Input placeholder="bank" {...register(`items.${index}.itemType`)} />
        </Field>
        <Field
          label="Código de fuente (opcional)"
          hint="Fuente registrada de la que sale el item. Si no existe, el backend lo guarda sin fuente."
          error={errors?.sourceCode?.message}
        >
          <Input
            className="font-mono text-sm"
            {...register(`items.${index}.sourceCode`)}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Confianza (opcional)"
          hint="Hasta 3 enteros y 2 decimales (ej: 85.5)."
          error={errors?.confidenceScore?.message}
        >
          <Input
            placeholder="85.5"
            className="font-mono text-sm"
            {...register(`items.${index}.confidenceScore`)}
          />
        </Field>
        <Field
          label="Atributos (JSON)"
          hint="Objeto JSON libre. Vacío o {} si no aplica."
          error={errors?.attributesText?.message}
        >
          <Textarea
            rows={3}
            className="font-mono text-xs"
            {...register(`items.${index}.attributesText`)}
          />
        </Field>
      </div>

      <AliasRows itemIndex={index} />
      <RiskMappingRows itemIndex={index} />
    </div>
  );
}
