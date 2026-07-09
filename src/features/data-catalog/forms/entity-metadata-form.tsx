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
import { SectionHeader } from "@/shared/components/layout/page-header";
import { BooleanField } from "./boolean-field";
import { metadataValuesFrom, mutationModes } from "./entity-metadata-values";

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

  return (
    <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
      <MetadataSection values={values} onChange={setValues} />
      <GovernanceSection values={values} onChange={setValues} />
      <div className="flex justify-end gap-2">
        <Button variant="primary" onClick={() => setConfirmOpen(true)}>
          Guardar configuración
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Guardar metadata de tabla"
        description="Se actualizará el catálogo y las reglas que el servicio interno debe obedecer para esta tabla."
        confirmText="Guardar"
        isLoading={isSaving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => onSubmit(values)}
      />
    </form>
  );
}

function MetadataSection({
  values,
  onChange,
}: Readonly<{
  values: DataEntityMetadataInput;
  onChange: (values: DataEntityMetadataInput) => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title="Metadata de negocio" className="mb-0" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Nombre de negocio"
          field="entityName"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Módulo"
          field="module"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Owner"
          field="dataOwner"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Retención"
          field="retentionPolicyCode"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Estado"
          field="status"
          values={values}
          onChange={onChange}
        />
        <Field label="Propósito de negocio">
          <Textarea
            value={values.businessPurpose}
            onChange={(event) =>
              onChange({ ...values, businessPurpose: event.target.value })
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function GovernanceSection({
  values,
  onChange,
}: Readonly<{
  values: DataEntityMetadataInput;
  onChange: (values: DataEntityMetadataInput) => void;
}>) {
  const setGovernance = (
    patch: Partial<DataEntityMetadataInput["governance"]>,
  ) => onChange({ ...values, governance: { ...values.governance, ...patch } });
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Reglas operativas que obedecerá el servicio"
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Modo de mutación">
          <Select
            value={values.governance.mutationMode}
            onChange={(event) =>
              setGovernance({ mutationMode: event.target.value })
            }
          >
            {mutationModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>
        <BooleanField
          label="Contiene PII"
          value={values.containsPii}
          onChange={(value) => onChange({ ...values, containsPii: value })}
        />
        <BooleanField
          label="Append only"
          value={values.governance.appendOnly}
          onChange={(value) => setGovernance({ appendOnly: value })}
        />
        <BooleanField
          label="Permite actualizar"
          value={values.governance.updatesAllowed}
          onChange={(value) => setGovernance({ updatesAllowed: value })}
        />
        <BooleanField
          label="Permite eliminar"
          value={values.governance.deletesAllowed}
          onChange={(value) => setGovernance({ deletesAllowed: value })}
        />
        <BooleanField
          label="Permite hard delete"
          value={values.governance.hardDeleteAllowed}
          onChange={(value) => setGovernance({ hardDeleteAllowed: value })}
        />
        <BooleanField
          label="Requiere aprobación"
          value={values.governance.approvalRequired}
          onChange={(value) => setGovernance({ approvalRequired: value })}
        />
        <BooleanField
          label="Auditoría crítica"
          value={values.isAuditCritical}
          onChange={(value) => onChange({ ...values, isAuditCritical: value })}
        />
        <Field label="Notas de gobierno">
          <Textarea
            value={values.governance.notes}
            onChange={(event) => setGovernance({ notes: event.target.value })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function TextField({
  label,
  field,
  values,
  onChange,
}: Readonly<{
  label: string;
  field: keyof Pick<
    DataEntityMetadataInput,
    "entityName" | "module" | "dataOwner" | "retentionPolicyCode" | "status"
  >;
  values: DataEntityMetadataInput;
  onChange: (values: DataEntityMetadataInput) => void;
}>) {
  return (
    <Field label={label}>
      <Input
        value={values[field]}
        onChange={(event) =>
          onChange({ ...values, [field]: event.target.value })
        }
      />
    </Field>
  );
}
