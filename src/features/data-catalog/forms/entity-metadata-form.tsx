"use client";

import { useState } from "react";
import type {
  DataEntity,
  DataEntityMetadataInput,
} from "@/features/systems/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { BooleanField } from "./boolean-field";
import {
  BOOLEAN_FIELDS,
  firstMetadataError,
  metadataPatch,
  metadataValuesFrom,
  reviewStatusOptions,
  statusOptions,
  type EntityMetadataFormValues,
} from "./entity-metadata-values";

/**
 * Ficha editable de una tabla del catálogo: propósito, responsable, retención, estado, revisión y
 * clasificación de datos. Es lo que el servidor guarda; nada más. Se envía sólo lo que cambió.
 */
export function EntityMetadataForm({
  entity,
  isSaving,
  onSubmit,
}: Readonly<{
  entity: DataEntity;
  isSaving: boolean;
  onSubmit: (values: DataEntityMetadataInput) => void;
}>) {
  const [values, setValues] = useState(() => metadataValuesFrom(entity));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const validationError = firstMetadataError(entity, values);
  const patch = metadataPatch(entity, values);
  const hasChanges = Object.keys(patch).length > 0;

  return (
    <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
      <BusinessSection values={values} onChange={setValues} />
      <ClassificationSection values={values} onChange={setValues} />
      {validationError ? (
        <ErrorState title="Revisa la ficha" description={validationError} />
      ) : null}
      <div className="flex items-center justify-end gap-3">
        {!hasChanges ? (
          <p className="text-sm text-atlas-muted" role="status">
            No hay cambios que guardar.
          </p>
        ) : null}
        <Button
          variant="primary"
          disabled={Boolean(validationError) || !hasChanges}
          onClick={() => setConfirmOpen(true)}
        >
          Guardar ficha
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Guardar ficha de la tabla"
        description={`Se actualizará la ficha de ${entity.schemaName}.${entity.tableName} en el catálogo de datos (${Object.keys(patch).length} campo(s)).`}
        confirmText="Guardar"
        isLoading={isSaving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => onSubmit(patch)}
      />
    </form>
  );
}

type SectionProps = Readonly<{
  values: EntityMetadataFormValues;
  onChange: (values: EntityMetadataFormValues) => void;
}>;

function BusinessSection({ values, onChange }: SectionProps) {
  const set = (patch: Partial<EntityMetadataFormValues>) =>
    onChange({ ...values, ...patch });
  return (
    <Card>
      <CardHeader>
        <SectionHeader title="Ficha de negocio" className="mb-0" />
      </CardHeader>
      <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field
          label="Responsable"
          tooltip="Equipo o persona que responde por los datos de esta tabla (mínimo 2 caracteres)."
        >
          <Input
            value={values.dataOwner}
            onChange={(event) => set({ dataOwner: event.target.value })}
          />
        </Field>
        <Field
          label="Política de retención"
          tooltip="Código de la política que dice cuánto tiempo se guardan estos datos. Déjalo vacío para quitarla."
        >
          <Input
            value={values.retentionPolicyCode}
            onChange={(event) =>
              set({ retentionPolicyCode: event.target.value })
            }
          />
        </Field>
        <Field
          label="Estado"
          tooltip="Si la tabla está en uso, deshabilitada o en camino de retirarse."
        >
          <Select
            name="status"
            value={values.status}
            onChange={(value) => set({ status: value })}
            options={statusOptions}
          />
        </Field>
        <Field
          label="Revisión"
          tooltip="En qué punto está la revisión humana de esta ficha."
        >
          <Select
            name="reviewStatus"
            value={values.reviewStatus}
            onChange={(value) => set({ reviewStatus: value })}
            options={reviewStatusOptions}
          />
        </Field>
        <Field
          label="Propósito de negocio"
          tooltip="Para qué existe esta tabla en el negocio, en lenguaje de operación (mínimo 3 caracteres)."
        >
          <Textarea
            value={values.businessPurpose}
            onChange={(event) => set({ businessPurpose: event.target.value })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function ClassificationSection({ values, onChange }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Clasificación de los datos"
          description="Qué tipo de información guarda la tabla. Lo usan gobierno de datos y el registro de datos personales."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {BOOLEAN_FIELDS.map(([field, label]) => (
          <BooleanField
            key={field}
            label={label}
            value={values[field]}
            onChange={(value) => onChange({ ...values, [field]: value })}
          />
        ))}
      </CardContent>
    </Card>
  );
}
