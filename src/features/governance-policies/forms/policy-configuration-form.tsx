"use client";

import { useState } from "react";
import type {
  GovernancePolicyConfigInput,
  GovernancePolicyDetail,
} from "../types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { BooleanField } from "./boolean-field";
import { policyConfigFrom, policyMutationModes } from "./policy-config-values";

export function PolicyConfigurationForm({
  policy,
  isSaving,
  onSubmit,
}: Readonly<{
  policy: GovernancePolicyDetail;
  isSaving: boolean;
  onSubmit: (values: GovernancePolicyConfigInput) => void;
}>) {
  const [values, setValues] = useState(() => policyConfigFrom(policy));
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
      <IdentityFields values={values} onChange={setValues} />
      <ScopeFields values={values} onChange={setValues} />
      <EnforcementFields values={values} onChange={setValues} />
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setConfirmOpen(true)}>
          Guardar política
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Guardar política de gobierno"
        description="El backend debe usar esta configuración para obedecer mutación, retención, auditoría y exportación."
        confirmText="Guardar"
        isLoading={isSaving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => onSubmit(values)}
      />
    </form>
  );
}

function IdentityFields({ values, onChange }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title="Identidad" className="mb-0" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Nombre"
          field="name"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Tipo"
          field="policyType"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Dueño"
          field="owner"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Versión"
          field="version"
          values={values}
          onChange={onChange}
        />
        <TextField
          label="Estado"
          field="status"
          values={values}
          onChange={onChange}
        />
        <Field label="Descripción">
          <Textarea
            value={values.description}
            onChange={(event) =>
              onChange({ ...values, description: event.target.value })
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function ScopeFields({ values, onChange }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title="Alcance" className="mb-0" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Tablas afectadas" hint="Una tabla por línea.">
          <Textarea
            value={values.scope.affectedTables}
            onChange={(event) =>
              onChange({
                ...values,
                scope: { ...values.scope, affectedTables: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Campos afectados" hint="Un campo por línea, si aplica.">
          <Textarea
            value={values.scope.affectedColumns}
            onChange={(event) =>
              onChange({
                ...values,
                scope: { ...values.scope, affectedColumns: event.target.value },
              })
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function EnforcementFields({ values, onChange }: FormSectionProps) {
  const setRule = (
    patch: Partial<GovernancePolicyConfigInput["enforcement"]>,
  ) =>
    onChange({ ...values, enforcement: { ...values.enforcement, ...patch } });
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Acciones que obedecerá el servicio"
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Modo de mutación">
          <Select
            value={values.enforcement.mutationMode}
            onChange={(event) => setRule({ mutationMode: event.target.value })}
          >
            {policyMutationModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>
        <BooleanField
          label="Append only"
          value={values.enforcement.appendOnly}
          onChange={(value) => setRule({ appendOnly: value })}
        />
        <BooleanField
          label="Permite update"
          value={values.enforcement.updateAllowed}
          onChange={(value) => setRule({ updateAllowed: value })}
        />
        <BooleanField
          label="Permite delete"
          value={values.enforcement.deleteAllowed}
          onChange={(value) => setRule({ deleteAllowed: value })}
        />
        <BooleanField
          label="Permite hard delete"
          value={values.enforcement.hardDeleteAllowed}
          onChange={(value) => setRule({ hardDeleteAllowed: value })}
        />
        <BooleanField
          label="Permite exportar"
          value={values.enforcement.exportAllowed}
          onChange={(value) => setRule({ exportAllowed: value })}
        />
        <BooleanField
          label="Requiere aprobación"
          value={values.enforcement.approvalRequired}
          onChange={(value) => setRule({ approvalRequired: value })}
        />
        <BooleanField
          label="Requiere motivo"
          value={values.enforcement.reasonRequired}
          onChange={(value) => setRule({ reasonRequired: value })}
        />
        <BooleanField
          label="Auditoría obligatoria"
          value={values.enforcement.auditRequired}
          onChange={(value) => setRule({ auditRequired: value })}
        />
        <Field label="Días de retención">
          <Input
            value={values.enforcement.retentionDays}
            onChange={(event) => setRule({ retentionDays: event.target.value })}
          />
        </Field>
        <Field label="Estrategia de masking">
          <Input
            value={values.enforcement.maskingStrategy}
            onChange={(event) =>
              setRule({ maskingStrategy: event.target.value })
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

type FormSectionProps = {
  values: GovernancePolicyConfigInput;
  onChange: (values: GovernancePolicyConfigInput) => void;
};

function TextField({
  label,
  field,
  values,
  onChange,
}: Readonly<{
  label: string;
  field: keyof Pick<
    GovernancePolicyConfigInput,
    "name" | "policyType" | "owner" | "version" | "status"
  >;
  values: GovernancePolicyConfigInput;
  onChange: (values: GovernancePolicyConfigInput) => void;
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
