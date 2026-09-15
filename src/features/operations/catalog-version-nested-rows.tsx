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
            className="grid gap-3 rounded-lg border border-atlas-border p-3 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto]"
          >
            <Field
              label="Valor"
              tooltip="Otra forma en que aparece el item en los datos, para reconocerlo igual."
              error={errors?.[index]?.aliasValue?.message}
            >
              <Input
                placeholder="Banco Nacional de Bolivia"
                {...register(`items.${itemIndex}.aliases.${index}.aliasValue`)}
              />
            </Field>
            <Field
              label="Tipo"
              tooltip="Clase de alias: sigla, nombre comercial o error de escritura frecuente."
              error={errors?.[index]?.aliasType?.message}
            >
              <Input
                className="font-mono text-xs"
                {...register(`items.${itemIndex}.aliases.${index}.aliasType`)}
              />
            </Field>
            <Field
              label="Confianza"
              tooltip="Cuánto se parece el alias al item, de 0 a 100; baja confianza pide revisión."
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
            <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
              <Field
                label="Dimensión"
                tooltip="Eje de riesgo que mueve este item. Ej.: income_stability"
                error={errors?.[index]?.riskDimension?.message}
              >
                <Input
                  placeholder="identity"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.riskDimension`,
                  )}
                />
              </Field>
              <Field
                label="Banda"
                tooltip="Nivel de riesgo que asigna el item en esa dimensión. Ej.: high"
                error={errors?.[index]?.riskBand?.message}
              >
                <Input
                  placeholder="high"
                  {...register(
                    `items.${itemIndex}.riskMappings.${index}.riskBand`,
                  )}
                />
              </Field>
              <Field
                label="Puntos"
                tooltip="Puntos que suma o resta al puntaje sugerido; negativo baja el riesgo."
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
                tooltip="Código de motivo que se enseña al explicar la decisión al analista."
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
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              <Field
                label="Uso en modelo"
                tooltip="Cómo lo consume el modelo: regla dura, variable o sólo informativo."
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
                tooltip="Desde qué fecha aplica este mapeo de riesgo; vacío es desde la versión."
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
                tooltip="Hasta qué fecha aplica este mapeo; vacío es mientras la versión viva."
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
              tooltip="Frase para el analista que explica por qué este item cambia el riesgo."
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
