"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import {
  emptyAliasForm,
  emptyRiskMappingForm,
  type CreateCatalogVersionForm,
} from "./catalog-version-schema";

/**
 * Filas anidadas de alias y mapeos de riesgo de un item. Usan `useFormContext`
 * en vez de recibir `control` por prop porque están dos niveles adentro
 * (`items.N.aliases.M`) y encadenar el control a mano por cada nivel hace que
 * un rename del campo padre rompa en silencio.
 */

export function AliasRows({ itemIndex }: Readonly<{ itemIndex: number }>) {
  const { control, register, formState } =
    useFormContext<CreateCatalogVersionForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.aliases`,
  });
  const errors = formState.errors.items?.[itemIndex]?.aliases;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-atlas-text">
          Alias ({fields.length})
        </p>
        <Button
          type="button"
          className="h-7 px-2 text-xs"
          onClick={() => append(emptyAliasForm)}
        >
          Agregar alias
        </Button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border border-atlas-border p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
          >
            <Field label="Valor" error={errors?.[index]?.aliasValue?.message}>
              <Input
                placeholder="Banco Nacional de Bolivia"
                {...register(`items.${itemIndex}.aliases.${index}.aliasValue`)}
              />
            </Field>
            <Field label="Tipo" error={errors?.[index]?.aliasType?.message}>
              <Input
                className="font-mono text-xs"
                {...register(`items.${itemIndex}.aliases.${index}.aliasType`)}
              />
            </Field>
            <Field
              label="Confianza"
              error={errors?.[index]?.confidenceScore?.message}
            >
              <Input
                placeholder="85.5"
                className="font-mono text-xs"
                {...register(
                  `items.${itemIndex}.aliases.${index}.confidenceScore`,
                )}
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                className="h-11 text-xs"
                onClick={() => remove(index)}
              >
                Quitar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiskMappingRows({
  itemIndex,
}: Readonly<{ itemIndex: number }>) {
  const { control, register, formState } =
    useFormContext<CreateCatalogVersionForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.riskMappings`,
  });
  const errors = formState.errors.items?.[itemIndex]?.riskMappings;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-atlas-text">
          Mapeos de riesgo ({fields.length})
        </p>
        <Button
          type="button"
          className="h-7 px-2 text-xs"
          onClick={() => append(emptyRiskMappingForm)}
        >
          Agregar mapeo
        </Button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-atlas-border p-3"
          >
            <div className="grid gap-3 md:grid-cols-4">
              <Field
                label="Dimensión"
                error={errors?.[index]?.riskDimension?.message}
              >
                <Input
                  placeholder="identity"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.riskDimension`,
                  )}
                />
              </Field>
              <Field label="Banda" error={errors?.[index]?.riskBand?.message}>
                <Input
                  placeholder="high"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.riskBand`,
                  )}
                />
              </Field>
              <Field
                label="Puntos"
                hint="Admite negativos."
                error={errors?.[index]?.scorePointsSuggested?.message}
              >
                <Input
                  placeholder="-12.5"
                  className="font-mono text-xs"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.scorePointsSuggested`,
                  )}
                />
              </Field>
              <Field
                label="Motivo"
                error={errors?.[index]?.reasonCode?.message}
              >
                <Input
                  placeholder="BLACKLISTED_ENTITY"
                  className="font-mono text-xs"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.reasonCode`,
                  )}
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Uso en modelo"
                error={errors?.[index]?.modelUsage?.message}
              >
                <Input
                  placeholder="scoring"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.modelUsage`,
                  )}
                />
              </Field>
              <Field
                label="Vigente desde"
                error={errors?.[index]?.validFrom?.message}
              >
                <Input
                  type="date"
                  className="font-mono text-xs"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.validFrom`,
                  )}
                />
              </Field>
              <Field
                label="Vigente hasta"
                error={errors?.[index]?.validUntil?.message}
              >
                <Input
                  type="date"
                  className="font-mono text-xs"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.validUntil`,
                  )}
                />
              </Field>
            </div>
            <Field
              label="Explicación"
              hint="Por qué este item mueve el riesgo. Se usa en la explicabilidad de la decisión."
              error={errors?.[index]?.explanation?.message}
            >
              <Textarea
                rows={2}
                {...register(
                  `items.${itemIndex}.riskMappings.${index}.explanation`,
                )}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => remove(index)}
            >
              Quitar mapeo
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
