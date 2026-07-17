"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { toCatalogIngestionInput } from "./catalog-version-adapters";
import {
  catalogIngestionFormSchema,
  emptyCatalogIngestionForm,
  emptyIngestionItemForm,
  type CatalogIngestionForm as IngestionFormValues,
} from "./catalog-ingestion-schema";
import { useIngestCatalogMutation } from "./hooks";

/**
 * Ingesta de valores crudos a staging para un catálogo.
 *
 * Aviso importante que la pantalla hace explícito: la ingesta deja los items en
 * staging, y hoy el backend NO expone ningún endpoint para listarlos
 * (`catalog-staging-items/decision-batch` pide `stagingItemId`s que la
 * respuesta de ingesta no devuelve — solo `stagingItemsCreated`). Es decir: se
 * puede ingerir, pero la revisión posterior todavía no se puede hacer desde el
 * portal. Se dice acá en vez de simular un flujo que no existe.
 */
export function CatalogIngestionForm({
  catalogCode,
  onClose,
}: Readonly<{ catalogCode: string; onClose: () => void }>) {
  const ingest = useIngestCatalogMutation();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IngestionFormValues>({
    resolver: zodResolver(catalogIngestionFormSchema),
    defaultValues: emptyCatalogIngestionForm(catalogCode),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const onSubmit = handleSubmit((values) => {
    ingest.mutate(toCatalogIngestionInput(values));
  });

  return (
    <DrawerPanel
      open
      title={`Ingerir valores a ${catalogCode}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Los valores quedan en <strong>staging</strong>, no entran al catálogo
          directamente. La revisión de items en staging todavía no está
          disponible en el portal: el backend no expone un listado de items
          staged, así que hoy no hay forma de aprobarlos o rechazarlos desde
          acá.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Código de catálogo" error={errors.catalogCode?.message}>
            <Input className="font-mono text-sm" {...register("catalogCode")} />
          </Field>
          <Field
            label="Tipo de fuente"
            hint="De dónde viene el lote. Ej: provider_file."
            error={errors.sourceType?.message}
          >
            <Input placeholder="provider_file" {...register("sourceType")} />
          </Field>
          <Field label="Nombre de fuente" error={errors.sourceName?.message}>
            <Input
              placeholder="Padrón ASFI julio 2026"
              {...register("sourceName")}
            />
          </Field>
          <Field
            label="Código de fuente (opcional)"
            error={errors.sourceCode?.message}
          >
            <Input className="font-mono text-sm" {...register("sourceCode")} />
          </Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-atlas-text">
                Items ({formatNumber(fields.length)})
              </p>
              <p className="text-xs text-atlas-muted">
                Al menos 1, máximo 1000.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => append(emptyIngestionItemForm)}
              disabled={fields.length >= 1000}
            >
              Agregar item
            </Button>
          </div>
          {errors.items?.message ? (
            <p className="mb-2 text-xs font-medium text-red-600">
              {errors.items.message}
            </p>
          ) : null}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 rounded-lg border border-atlas-border p-3"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    label="Valor crudo"
                    error={errors.items?.[index]?.rawValue?.message}
                  >
                    <Input {...register(`items.${index}.rawValue`)} />
                  </Field>
                  <Field
                    label="Valor normalizado (opcional)"
                    error={errors.items?.[index]?.normalizedValue?.message}
                  >
                    <Input
                      className="font-mono text-xs"
                      {...register(`items.${index}.normalizedValue`)}
                    />
                  </Field>
                  <Field
                    label="Tipo"
                    error={errors.items?.[index]?.itemType?.message}
                  >
                    <Input {...register(`items.${index}.itemType`)} />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Confianza (opcional)"
                    error={errors.items?.[index]?.confidenceScore?.message}
                  >
                    <Input
                      placeholder="85.5"
                      className="font-mono text-xs"
                      {...register(`items.${index}.confidenceScore`)}
                    />
                  </Field>
                  <Field
                    label="Payload crudo (JSON)"
                    error={errors.items?.[index]?.rawPayloadText?.message}
                  >
                    <Textarea
                      rows={2}
                      className="font-mono text-xs"
                      {...register(`items.${index}.rawPayloadText`)}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-atlas-text">
                    <input
                      type="checkbox"
                      {...register(`items.${index}.aiSuggested`)}
                    />
                    Sugerido por IA
                  </label>
                  {fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => remove(index)}
                    >
                      Quitar item
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {ingest.error ? (
          <ErrorState
            title="No se pudo ingerir el lote"
            description={
              isAtlasApiError(ingest.error)
                ? ingest.error.message
                : "Error inesperado al ingerir el lote."
            }
            requestId={
              isAtlasApiError(ingest.error) ? ingest.error.requestId : undefined
            }
          />
        ) : null}
        {ingest.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Lote ingerido (job{" "}
            <span className="font-mono">{ingest.data.ingestionJobId}</span>,
            estado <span className="font-mono">{ingest.data.status}</span>):{" "}
            {formatNumber(ingest.data.stagingItemsCreated)} items en staging. El
            backend no devuelve los IDs de esos items ni los expone en un
            listado, así que su revisión queda fuera del portal por ahora.
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={ingest.isPending}
            loadingText="Ingiriendo…"
            disabled={ingest.isPending}
          >
            Ingerir lote
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
