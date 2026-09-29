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
import { CatalogStagingPanel } from "./catalog-staging-panel";
import { useIngestCatalogMutation } from "./hooks";
import type { ContextCatalog } from "./types";

/**
 * Ingesta de valores crudos a staging para un catálogo, y su revisión.
 *
 * Ingerir deja los ítems en staging; debajo del formulario se listan los pendientes
 * (`GET /operations/catalog-staging-items`) —los de la ingesta recién hecha o, al abrir, todos los
 * del catálogo— y se aprueban o rechazan en lote (`catalog-staging-items/decision-batch`).
 */
export function CatalogIngestionForm({
  catalogCode,
  currentVersion,
  onClose,
}: Readonly<{
  catalogCode: string;
  currentVersion?: ContextCatalog["currentVersion"];
  onClose: () => void;
}>) {
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
          Los valores quedan <strong>pendientes de revisión</strong>, no entran
          al catálogo directamente. Debajo del formulario puedes revisarlos y
          aprobarlos o rechazarlos en lote.
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Field
            label="Código de catálogo"
            tooltip="Código del catálogo que recibe el lote; debe existir ya. Ej.: bancos_bolivia"
            error={errors.catalogCode?.message}
          >
            <Input className="font-mono text-sm" {...register("catalogCode")} />
          </Field>
          <Field
            label="Tipo de fuente"
            tooltip="Clase de origen del lote, para saber cuánto fiarse de él. Ej.: provider_file"
            hint="De dónde viene el lote. Ej: provider_file."
            error={errors.sourceType?.message}
          >
            <Input placeholder="provider_file" {...register("sourceType")} />
          </Field>
          <Field
            label="Nombre de fuente"
            tooltip="Nombre legible del lote tal como lo reconocerá quien lo revise después."
            error={errors.sourceName?.message}
          >
            <Input
              placeholder="Padrón ASFI julio 2026"
              {...register("sourceName")}
            />
          </Field>
          <Field
            label="Código de fuente (opcional)"
            tooltip="Código de una fuente ya registrada; enlaza el lote con su proveedor."
            error={errors.sourceCode?.message}
          >
            <Input className="font-mono text-sm" {...register("sourceCode")} />
          </Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-atlas-text">
                Elementos ({formatNumber(fields.length)})
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
              Agregar elemento
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
                <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                  <Field
                    label="Valor crudo"
                    tooltip="El valor tal como vino en el archivo, sin corregir, para poder rastrearlo."
                    error={errors.items?.[index]?.rawValue?.message}
                  >
                    <Input {...register(`items.${index}.rawValue`)} />
                  </Field>
                  <Field
                    label="Valor normalizado (opcional)"
                    tooltip="El valor ya limpio (mayúsculas, sin tildes sobrantes); vacío si no aplica."
                    error={errors.items?.[index]?.normalizedValue?.message}
                  >
                    <Input
                      className="font-mono text-xs"
                      {...register(`items.${index}.normalizedValue`)}
                    />
                  </Field>
                  <Field
                    label="Tipo"
                    tooltip="Categoría del elemento dentro del catálogo; decide cómo lo usará el motor."
                    error={errors.items?.[index]?.itemType?.message}
                  >
                    <Input {...register(`items.${index}.itemType`)} />
                  </Field>
                </div>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  <Field
                    label="Confianza (opcional)"
                    tooltip="Cuánto te fías del valor, de 0 a 100. Ej.: 85.5"
                    error={errors.items?.[index]?.confidenceScore?.message}
                  >
                    <Input
                      placeholder="85.5"
                      className="font-mono text-xs"
                      {...register(`items.${index}.confidenceScore`)}
                    />
                  </Field>
                  <Field
                    label="Fila original (JSON)"
                    tooltip="La fila original completa en JSON, tal como llegó, para poder auditarla después."
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
                      Quitar elemento
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
            Lote recibido (carga n.º{" "}
            <span className="font-mono">{ingest.data.ingestionJobId}</span>):{" "}
            {formatNumber(ingest.data.stagingItemsCreated)} elementos pendientes
            de revisión. Abajo aparecen para aprobarlos o rechazarlos.
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
      <div className="mt-6">
        <CatalogStagingPanel
          catalogCode={catalogCode}
          ingestionJobId={ingest.data?.ingestionJobId}
          currentVersion={currentVersion}
        />
      </div>
    </DrawerPanel>
  );
}
