"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useProposeSchemaTableMutation } from "./hooks";
import { ColumnRowEditor, RelationshipRowEditor } from "./propose-table-rows";
import {
  emptyColumn,
  emptyRelationship,
  proposeTableDefaults,
  proposeTableSchema,
  toProposeTableInput,
  type ProposeTableForm,
} from "./propose-table-schema";

export function ProposeTableForm({
  onClose,
}: Readonly<{ onClose: () => void }>) {
  const propose = useProposeSchemaTableMutation();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposeTableForm>({
    resolver: zodResolver(proposeTableSchema),
    defaultValues: proposeTableDefaults,
  });

  // `useFieldArray` usa `field.id` como key, no el índice: arregla el bug en el
  // que borrar/reordenar una fila hacía que React reusara el estado de la fila
  // vecina (el clásico `key={index}` sobre una lista mutable).
  const columns = useFieldArray({ control, name: "columns" });
  const relationships = useFieldArray({ control, name: "relationships" });

  const onSubmit = handleSubmit((values) => {
    propose.mutate(toProposeTableInput(values));
  });

  return (
    <DrawerPanel open title="Proponer tabla nueva" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre de tabla"
            hint="snake_case, mín. 3 caracteres."
            error={errors.tableName?.message}
          >
            <Input
              placeholder="ej: customer_watchlist_entries"
              className="font-mono text-sm"
              {...register("tableName")}
            />
          </Field>
          <Field label="Tipo">
            <Select {...register("tableType")}>
              <option value="transactional">Transactional</option>
              <option value="catalog">Catalog</option>
              <option value="audit">Audit</option>
              <option value="operational">Operational</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input type="checkbox" {...register("isAppendOnly")} />
            Append-only
          </label>
          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input type="checkbox" {...register("isTenantScoped")} />
            Multi-tenant
          </label>
        </div>
        <Field label="Descripción (opcional)">
          <Textarea className="min-h-16" {...register("description")} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-atlas-text">Columnas</p>
            <Button
              type="button"
              className="h-7 px-2 text-xs"
              onClick={() => columns.append({ ...emptyColumn })}
            >
              Agregar columna
            </Button>
          </div>
          {errors.columns?.message ? (
            <p className="mb-2 text-xs font-medium text-red-600">
              {errors.columns.message}
            </p>
          ) : null}
          <div className="space-y-3">
            {columns.fields.map((field, index) => (
              <Controller
                key={field.id}
                control={control}
                name={`columns.${index}`}
                render={({ field: columnField }) => (
                  <ColumnRowEditor
                    column={columnField.value}
                    onChange={columnField.onChange}
                    onRemove={
                      columns.fields.length > 1
                        ? () => columns.remove(index)
                        : undefined
                    }
                  />
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-atlas-text">
              Relaciones (opcional)
            </p>
            <Button
              type="button"
              className="h-7 px-2 text-xs"
              onClick={() => relationships.append({ ...emptyRelationship })}
            >
              Agregar relación
            </Button>
          </div>
          <div className="space-y-3">
            {relationships.fields.map((field, index) => (
              <Controller
                key={field.id}
                control={control}
                name={`relationships.${index}`}
                render={({ field: relationshipField }) => (
                  <RelationshipRowEditor
                    relationship={relationshipField.value}
                    onChange={relationshipField.onChange}
                    onRemove={() => relationships.remove(index)}
                  />
                )}
              />
            ))}
          </div>
        </div>

        <Field
          label="Justificación"
          hint="Mín. 10 caracteres: por qué se necesita esta tabla."
          error={errors.justification?.message}
        >
          <Textarea className="min-h-20" {...register("justification")} />
        </Field>

        {propose.error ? (
          <ErrorState
            title="No se pudo registrar la propuesta"
            description={
              isAtlasApiError(propose.error)
                ? propose.error.message
                : "Error inesperado."
            }
            requestId={
              isAtlasApiError(propose.error)
                ? propose.error.requestId
                : undefined
            }
          />
        ) : null}
        {propose.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Propuesta registrada (change #{propose.data.changeId}), pendiente de
            aprobación de un platform_admin distinto de vos.
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={propose.isPending}
            loadingText="Enviando…"
            disabled={propose.isPending}
          >
            Registrar propuesta
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
