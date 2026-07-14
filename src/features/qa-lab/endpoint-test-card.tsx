"use client";

import { useEffect, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import {
  EndpointRunFormState,
  EndpointSafetyHints,
  MutationError,
  RunControls,
  requiresDoubleConfirmation,
} from "./endpoint-run-controls";
import { DEFAULT_QA_BASE_ROUTE } from "./base-routes";
import { expectedStatusesText, parseEndpointRunForm } from "./qa-form";
import { jsonText } from "./json-utils";
import { findPayloadPreset } from "./payload-presets";
import { QaJsonFields } from "./qa-json-fields";
import { QaLogDownload } from "./qa-log-download";
import { RunResultSummary } from "./qa-result-summary";
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

  const preset = findPayloadPreset(
    endpoint?.method ?? "GET",
    endpoint?.fullPath ?? endpoint?.routePath,
  );

  function applyPreset() {
    if (!preset) return;
    patchForm({
      payload: jsonText(preset.payload ?? {}),
      queryParams: jsonText(preset.queryParams ?? {}),
      pathParams: jsonText(preset.pathParams ?? {}),
    });
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
        {preset ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <Button variant="secondary" onClick={applyPreset}>
              Usar payload de ejemplo: {preset.label}
            </Button>
            <p className="text-xs text-blue-900">{preset.notes}</p>
          </div>
        ) : null}
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
        typedConfirmationPhrase={
          requiresDoubleConfirmation(form) ? "EJECUTAR" : undefined
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </Card>
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
    scenario: "valid_payload",
    authMode: "session",
    customAuthToken: "",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    deviceProfile: "none",
  };
}
