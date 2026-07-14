"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useProposeSchemaTableMutation } from "./hooks";
import { ColumnRowEditor, RelationshipRowEditor } from "./propose-table-rows";
import type {
  NewColumnInput,
  NewRelationshipInput,
  SchemaTableType,
} from "./types";

const emptyColumn: NewColumnInput = {
  columnName: "",
  columnType: "bigint",
  isNullable: false,
  isImmutable: false,
  isPii: false,
  isIndexed: false,
};

const emptyRelationship: NewRelationshipInput = {
  sourceColumnName: "",
  targetTableName: "",
  targetColumnName: "_id",
  cascadeDelete: false,
};

export function ProposeTableForm({
  onClose,
}: Readonly<{ onClose: () => void }>) {
  const [tableName, setTableName] = useState("");
  const [tableType, setTableType] = useState<SchemaTableType>("operational");
  const [isAppendOnly, setIsAppendOnly] = useState(false);
  const [isTenantScoped, setIsTenantScoped] = useState(true);
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [columns, setColumns] = useState<NewColumnInput[]>([emptyColumn]);
  const [relationships, setRelationships] = useState<NewRelationshipInput[]>(
    [],
  );
  const propose = useProposeSchemaTableMutation();

  const canSubmit =
    tableName.trim().length >= 3 &&
    justification.trim().length >= 10 &&
    columns.every(
      (column) => column.columnName.trim() && column.columnType.trim(),
    );

  function submit() {
    propose.mutate({
      tableName: tableName.trim(),
      tableType,
      isAppendOnly,
      isTenantScoped,
      description: description.trim() || undefined,
      columns,
      relationships: relationships.filter(
        (r) => r.sourceColumnName.trim() && r.targetTableName.trim(),
      ),
      justification: justification.trim(),
    });
  }

  return (
    <DrawerPanel open title="Proponer tabla nueva" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre de tabla" hint="snake_case, mín. 3 caracteres.">
            <Input
              value={tableName}
              onChange={(event) => setTableName(event.target.value)}
              placeholder="ej: customer_watchlist_entries"
              className="font-mono text-sm"
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={tableType}
              onChange={(event) =>
                setTableType(event.target.value as SchemaTableType)
              }
            >
              <option value="transactional">Transactional</option>
              <option value="catalog">Catalog</option>
              <option value="audit">Audit</option>
              <option value="operational">Operational</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={isAppendOnly}
              onChange={(event) => setIsAppendOnly(event.target.checked)}
            />
            Append-only
          </label>
          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={isTenantScoped}
              onChange={(event) => setIsTenantScoped(event.target.checked)}
            />
            Multi-tenant
          </label>
        </div>
        <Field label="Descripción (opcional)">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-16"
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-atlas-text">Columnas</p>
            <Button
              className="h-7 px-2 text-xs"
              onClick={() =>
                setColumns((current) => [...current, { ...emptyColumn }])
              }
            >
              Agregar columna
            </Button>
          </div>
          <div className="space-y-3">
            {columns.map((column, index) => (
              <ColumnRowEditor
                key={index}
                column={column}
                onChange={(next) =>
                  setColumns((current) =>
                    current.map((c, i) => (i === index ? next : c)),
                  )
                }
                onRemove={
                  columns.length > 1
                    ? () =>
                        setColumns((current) =>
                          current.filter((_, i) => i !== index),
                        )
                    : undefined
                }
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
              className="h-7 px-2 text-xs"
              onClick={() =>
                setRelationships((current) => [
                  ...current,
                  { ...emptyRelationship },
                ])
              }
            >
              Agregar relación
            </Button>
          </div>
          <div className="space-y-3">
            {relationships.map((relationship, index) => (
              <RelationshipRowEditor
                key={index}
                relationship={relationship}
                onChange={(next) =>
                  setRelationships((current) =>
                    current.map((r, i) => (i === index ? next : r)),
                  )
                }
                onRemove={() =>
                  setRelationships((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              />
            ))}
          </div>
        </div>

        <Field
          label="Justificación"
          hint="Mín. 10 caracteres: por qué se necesita esta tabla."
        >
          <Textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            className="min-h-20"
          />
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
            variant="primary"
            disabled={!canSubmit}
            isLoading={propose.isPending}
            loadingText="Enviando…"
            onClick={submit}
          >
            Registrar propuesta
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </DrawerPanel>
  );
}
