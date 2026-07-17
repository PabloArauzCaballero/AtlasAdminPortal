"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { toCreateCatalogVersionInput } from "./catalog-version-adapters";
import { CatalogVersionItemFields } from "./catalog-version-item-fields";
import {
  createCatalogVersionFormSchema,
  emptyCatalogItemForm,
  emptyCreateCatalogVersionForm,
  type CreateCatalogVersionForm,
} from "./catalog-version-schema";
import { useCreateCatalogVersionMutation } from "./hooks";

/**
 * Alta de una versión de catálogo. Siempre nace como `draft`: el backend fija
 * el estado y no lo acepta como parámetro, así que desde acá no hay forma de
 * publicar nada sin pasar por el flujo de aprobación.
 *
 * El formulario cubre el caso real de trabajo a mano (unos pocos items con sus
 * alias y mapeos). El backend admite hasta 500 items por versión; para cargas
 * masivas el camino es la ingesta, no tipear 500 filas acá.
 */
export function CatalogVersionCreateForm({
  catalogCode,
  onCreated,
  onClose,
}: Readonly<{
  catalogCode: string;
  onCreated: (versionId: string) => void;
  onClose: () => void;
}>) {
  const create = useCreateCatalogVersionMutation(catalogCode);
  const form = useForm<CreateCatalogVersionForm>({
    resolver: zodResolver(createCatalogVersionFormSchema),
    defaultValues: emptyCreateCatalogVersionForm,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toCreateCatalogVersionInput(values), {
      onSuccess: (result) => onCreated(result.catalogVersionId),
    });
  });

  return (
    <DrawerPanel
      open
      title={`Nueva versión de ${catalogCode}`}
      onClose={onClose}
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <p className="text-sm text-atlas-muted">
            La versión se crea como{" "}
            <span className="font-mono text-xs">draft</span>: no afecta a
            ninguna regla hasta que se envíe a aprobación y un administrador la
            publique.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Código de versión"
              hint="2 a 60 caracteres. Ej: 2026.07."
              error={errors.versionCode?.message}
            >
              <Input
                placeholder="2026.07"
                className="font-mono text-sm"
                {...form.register("versionCode")}
              />
            </Field>
            <Field
              label="Vigente desde (opcional)"
              error={errors.validFrom?.message}
            >
              <Input
                type="date"
                className="font-mono text-sm"
                {...form.register("validFrom")}
              />
            </Field>
            <Field
              label="Vigente hasta (opcional)"
              error={errors.validUntil?.message}
            >
              <Input
                type="date"
                className="font-mono text-sm"
                {...form.register("validUntil")}
              />
            </Field>
          </div>

          <Field
            label="Notas (opcional)"
            hint="Qué trae esta versión. Se guarda en el evento de creación."
            error={errors.notes?.message}
          >
            <Textarea rows={2} {...form.register("notes")} />
          </Field>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-atlas-text">
                  Items ({fields.length})
                </p>
                <p className="text-xs text-atlas-muted">
                  Al menos 1, máximo 500.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => append(emptyCatalogItemForm)}
                disabled={fields.length >= 500}
              >
                Agregar item
              </Button>
            </div>
            {errors.items?.message ? (
              <p className="mb-2 text-xs font-medium text-red-600">
                {errors.items.message}
              </p>
            ) : null}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <CatalogVersionItemFields
                  key={field.id}
                  index={index}
                  onRemove={fields.length > 1 ? () => remove(index) : undefined}
                />
              ))}
            </div>
          </div>

          {create.error ? (
            <ErrorState
              title="No se pudo crear la versión"
              description={
                isAtlasApiError(create.error)
                  ? create.error.message
                  : "Error inesperado al crear la versión."
              }
              requestId={
                isAtlasApiError(create.error)
                  ? create.error.requestId
                  : undefined
              }
            />
          ) : null}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={create.isPending}
              loadingText="Creando…"
              disabled={create.isPending}
            >
              Crear borrador
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </FormProvider>
    </DrawerPanel>
  );
}
