"use client";

import { useEffect, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import { useAuth } from "@/shared/auth/auth-context";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { normalizeExpectedStatuses } from "./assertions";
import { DEFAULT_QA_BASE_ROUTE } from "./base-routes";
import { expectedStatusesText, parseEndpointRunForm } from "./qa-form";
import {
  CheckBox,
  NumberField,
  QaExpectationsControls,
  QaTargetControls,
  type CommonLabFormState,
} from "./qa-controls";
import { jsonText } from "./json-utils";
import { QaJsonFields } from "./qa-json-fields";
import { QaLogDownload } from "./qa-log-download";
import { RunResultSummary } from "./qa-result-summary";
import { isMutatingMethod } from "./qa-safety";
import { useEndpointRunMutation } from "./hooks";

export function EndpointTestCard({
  endpointId,
  endpoint,
}: Readonly<{ endpointId: string; endpoint?: EndpointItem }>) {
  const { hasPermission } = useAuth();
  const runMutation = useEndpointRunMutation(endpoint);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EndpointRunFormState>(defaultRunForm());
  const canExecute = hasPermission("systems.endpoints.execute");

  useEffect(() => setForm(defaultRunForm(endpoint)), [endpoint]);

  function patchForm(value: Partial<EndpointRunFormState>) {
    setForm((current) => ({ ...current, ...value }));
  }

  function submit() {
    const parsed = parseEndpointRunForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    runMutation.mutate(parsed.value, {
      onSuccess: () => setConfirmOpen(false),
    });
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="2. Prueba funcional del endpoint"
          description="Configura host, request, payload de entrada y criterios de salida antes de ejecutar."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <EndpointSafetyHints endpoint={endpoint} />
        <RunControls form={form} endpoint={endpoint} onChange={patchForm} />
        <QaJsonFields
          fields={[
            {
              label: "Payload de entrada",
              value: form.payload,
              onChange: (value) => patchForm({ payload: value }),
            },
            {
              label: "Headers request",
              value: form.headers,
              onChange: (value) => patchForm({ headers: value }),
            },
            {
              label: "Query params",
              value: form.queryParams,
              onChange: (value) => patchForm({ queryParams: value }),
            },
            {
              label: "Path params",
              value: form.pathParams,
              onChange: (value) => patchForm({ pathParams: value }),
            },
            {
              label: "JSON esperado en respuesta",
              value: form.expectedJsonSubset,
              onChange: (value) => patchForm({ expectedJsonSubset: value }),
            },
            {
              label: "Headers esperados respuesta",
              value: form.expectedHeaders,
              onChange: (value) => patchForm({ expectedHeaders: value }),
            },
          ]}
        />
        {error ? (
          <ErrorState title="Formulario invalido" description={error} />
        ) : null}
        {runMutation.error ? <MutationError error={runMutation.error} /> : null}
        <Button
          variant="primary"
          disabled={!endpointId || !canExecute || runMutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {form.dryRun ? "Previsualizar request" : "Ejecutar request real"}
        </Button>
        {runMutation.data ? (
          <div className="space-y-3">
            <RunResultSummary result={runMutation.data} />
            {runMutation.data.pinoLogFileName &&
            runMutation.data.pinoLogLines ? (
              <QaLogDownload
                fileName={runMutation.data.pinoLogFileName}
                lines={runMutation.data.pinoLogLines}
              />
            ) : null}
            <JsonViewer title="Resultado completo" value={runMutation.data} />
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        title={form.dryRun ? "Confirmar dry-run" : "Confirmar ejecucion real"}
        description={`Se ${form.dryRun ? "previsualizara" : "ejecutara"} el endpoint #${endpointId} en ${form.environment}.`}
        confirmText={form.dryRun ? "Previsualizar" : "Ejecutar"}
        isLoading={runMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </Card>
  );
}

function RunControls({ form, endpoint, onChange }: Readonly<RunControlsProps>) {
  const method = endpoint?.method ?? "GET";
  const requiresMutationGuard =
    isMutatingMethod(method) || Boolean(endpoint?.isDestructive);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Ambiente">
          <Select
            value={form.environment}
            onChange={(event) => onChange({ environment: event.target.value })}
          >
            <option value="LOCAL">LOCAL</option>
            <option value="STAGING">STAGING</option>
            <option value="PRODUCTION_READONLY">PRODUCTION_READONLY</option>
          </Select>
        </Field>
        <NumberField
          label="Timeout ms"
          value={form.timeoutMs}
          min={1000}
          max={120000}
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <Field label="Metodo">
          <Input value={method} readOnly className="font-mono" />
        </Field>
      </div>
      <QaTargetControls form={form} endpoint={endpoint} onChange={onChange} />
      <QaExpectationsControls form={form} onChange={onChange} />
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Dry-run / modo seguro"
          checked={form.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        {requiresMutationGuard ? (
          <CheckBox
            label="Permitir mutacion real"
            checked={form.allowMutations}
            onChange={(value) => onChange({ allowMutations: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

function EndpointSafetyHints({
  endpoint,
}: Readonly<{ endpoint?: EndpointItem }>) {
  if (!endpoint) return null;
  const expectedStatuses = normalizeExpectedStatuses(
    endpoint.expectedStatusCodes,
  );
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-atlas-border bg-atlas-soft p-3 text-xs">
      <Badge tone="default">esperado: {expectedStatuses.join(", ")}</Badge>
      <Badge tone={endpoint.requiresAuth ? "warning" : "success"}>
        {endpoint.requiresAuth ? "requiere sesion" : "sin auth"}
      </Badge>
      <Badge tone={endpoint.isReadonly ? "success" : "warning"}>
        {endpoint.isReadonly ? "readonly" : "cambia estado"}
      </Badge>
      {endpoint.isDestructive ? (
        <Badge tone="critical">destructivo</Badge>
      ) : null}
      {endpoint.testEnvironmentOnly ? (
        <Badge tone="warning">solo testing</Badge>
      ) : null}
    </div>
  );
}

function defaultRunForm(endpoint?: EndpointItem): EndpointRunFormState {
  return {
    environment: "LOCAL",
    baseRouteKey: DEFAULT_QA_BASE_ROUTE,
    customHostUrl: "",
    routeOverride: endpoint?.fullPath || endpoint?.routePath || "",
    dryRun: true,
    timeoutMs: 20000,
    allowMutations: false,
    payload: jsonText(endpoint?.minPayloadSchema),
    queryParams: jsonText(endpoint?.queryParamsSchema),
    pathParams: jsonText(endpoint?.pathParamsSchema),
    headers: jsonText(endpoint?.headersSchema),
    expectedStatusCodes: expectedStatusesText(endpoint?.expectedStatusCodes),
    expectedHeaders: "{}",
    expectedJsonSubset: "",
    expectedBodyContains: "",
    maxLatencyMs: 20000,
    maxResponseSizeBytes: 0,
  };
}

type EndpointRunFormState = CommonLabFormState & {
  environment: string;
  dryRun: boolean;
  timeoutMs: number;
  allowMutations: boolean;
  payload: string;
  queryParams: string;
  pathParams: string;
  headers: string;
  expectedHeaders: string;
  expectedJsonSubset: string;
};

type RunControlsProps = {
  form: EndpointRunFormState;
  endpoint?: EndpointItem;
  onChange: (value: Partial<EndpointRunFormState>) => void;
};

function MutationError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo ejecutar el endpoint."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
