"use client";

import { useEffect, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { ENVIRONMENT_OPTIONS } from "./qa-lab-options";
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
import { defaultQaEnvironment } from "./environment";
import { useQaTestData } from "./fakers/use-fakers";
import { isMockEndpointId } from "./mock-provider-endpoints";
import { expectedStatusesText, parseEndpointRunForm } from "./qa-form";
import { jsonText } from "./json-utils";
import { PresetBar } from "./preset-bar";
import { QaJsonFields } from "./qa-json-fields";
import { QaLogDownload } from "./qa-log-download";
import { QaSampleBar } from "./qa-sample-bar";
import { useGeneratedEntries } from "./use-generated-entries";
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

  const testData = useQaTestData();
  const generated = useGeneratedEntries({
    endpoint,
    data: testData,
    form,
    patchForm,
  });

  /**
   * Se valida ANTES de abrir el diálogo (mismo patrón que `JourneyRunnerPanel`).
   * Validar dentro de `submit` dejaba el error pintado en la card, detrás del
   * backdrop `z-50` del propio diálogo: el operador pulsaba "Ejecutar" y no
   * pasaba nada visible (RESUELTO_ATLAS_F1_R7).
   */
  function tryExecute() {
    const parsed = parseEndpointRunForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  function submit() {
    const parsed = parseEndpointRunForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      setConfirmOpen(false);
      return;
    }
    setError(null);
    runMutation.mutate(parsed.value, {
      onSuccess: () => setConfirmOpen(false),
      // Igual que arriba: el error de la mutación vive en la card, así que el
      // diálogo tiene que apartarse para que se pueda leer.
      onError: () => setConfirmOpen(false),
    });
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Prueba funcional"
          description="Genera los datos de entrada, elige contra qué API y qué resultado esperas, y envía la petición a la operación real (o sólo previsualízala)."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <EndpointSafetyHints endpoint={endpoint} />
        {/*
          El generador va ARRIBA del todo, antes de la configuración: llenar la entrada es el primer
          paso de la prueba, y tenerlo al final —después de treinta campos de host, timeouts y
          umbrales— era la razón práctica de que casi nadie probara la clase inválida.
        */}
        <QaSampleBar
          endpoint={endpoint}
          data={testData}
          onLoad={(sample) => {
            generated.markManual();
            patchForm({
              payload: jsonText(sample.payload),
              ...(Object.keys(sample.pathParams).length
                ? { pathParams: jsonText(sample.pathParams) }
                : {}),
              ...(sample.kind === "invalid"
                ? {
                    expectedStatusCodes: "400, 422",
                    scenario: "invalid_payload",
                  }
                : {}),
            });
          }}
        />
        <RunControls
          form={form}
          endpoint={endpoint}
          onChange={patchForm}
          onInvalidCase={() => void generated.loadInvalidCase()}
        />
        <PresetBar
          preset={generated.preset}
          onApply={() => generated.applyPreset()}
          notice={generated.notice}
        />
        <QaJsonFields
          fields={[
            {
              label: "Datos de entrada",
              tooltip: "El cuerpo (JSON) que lleva la petición de prueba.",
              value: form.payload,
              onChange: (value) => {
                generated.markManual();
                patchForm({ payload: value });
              },
            },
            {
              label: "Cabeceras extra",
              tooltip:
                "Cabeceras (JSON) que se añaden a la petición; no pongas secretos.",
              value: form.headers,
              onChange: (value) => patchForm({ headers: value }),
            },
            {
              label: "Datos de consulta",
              tooltip:
                "Parámetros (JSON) que se añaden a la dirección tras el «?».",
              value: form.queryParams,
              onChange: (value) => patchForm({ queryParams: value }),
            },
            {
              label: "Datos de la ruta",
              tooltip:
                "Valores (JSON) para los :parámetros de la ruta, p. ej. el número de cliente.",
              value: form.pathParams,
              onChange: (value) => {
                generated.markManual();
                patchForm({ pathParams: value });
              },
            },
            {
              label: "Fragmento esperado en la respuesta",
              tooltip:
                "Fragmento (JSON) que la respuesta debe contener para aprobar.",
              value: form.expectedJsonSubset,
              onChange: (value) => patchForm({ expectedJsonSubset: value }),
            },
            {
              label: "Cabeceras esperadas en la respuesta",
              tooltip:
                "Cabeceras (JSON) que la respuesta debe traer, p. ej. content-type.",
              value: form.expectedHeaders,
              onChange: (value) => patchForm({ expectedHeaders: value }),
            },
          ]}
        />
        {error ? (
          <ErrorState title="Formulario inválido" description={error} />
        ) : null}
        {runMutation.error ? <MutationError error={runMutation.error} /> : null}
        <Button
          variant="primary"
          data-tutorial-id="qa-lab-run-functional"
          disabled={!endpointId || !canExecute || runMutation.isPending}
          onClick={tryExecute}
        >
          {form.dryRun ? "Previsualizar petición" : "Enviar petición real"}
        </Button>
        {runMutation.data ? (
          <div
            className="space-y-3"
            data-tutorial-id="qa-lab-functional-result"
          >
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
        title={
          form.dryRun ? "Confirmar previsualización" : "Confirmar envío real"
        }
        description={`Se ${form.dryRun ? "previsualizará" : "enviará"} la operación #${endpointId} contra «${environmentLabel(form.environment)}».`}
        confirmText={form.dryRun ? "Previsualizar" : "Enviar"}
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

function environmentLabel(value: string): string {
  return (
    ENVIRONMENT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

/**
 * El formulario abre con los datos VACÍOS y el generador los rellena en cuanto llega el lote de la
 * semilla elegida (`useGeneratedEntries`). Las cabeceras abren vacías: antes recibían el contrato
 * literal (`{"x-tenant-id":"required"}`), que se mandaba tal cual y pisaba la cabecera real.
 */
function defaultRunForm(endpoint?: EndpointItem): EndpointRunFormState {
  const isMock = Boolean(endpoint && isMockEndpointId(endpoint.endpointId));
  return {
    environment: defaultQaEnvironment(),
    // Un endpoint del mock ya trae `fullPath` absoluto (bypassa la ruta base al construir la
    // URL), pero fijar acá "Mock de proveedores externos" es lo que revela en el formulario los
    // controles de escenario/latencia del mock (gateados por `baseRouteKey`).
    baseRouteKey: isMock ? "MOCK_PROVIDERS" : DEFAULT_QA_BASE_ROUTE,
    customHostUrl: "",
    routeOverride: endpoint?.fullPath || endpoint?.routePath || "",
    dryRun: true,
    timeoutMs: 20000,
    allowMutations: false,
    payload: "{}",
    queryParams: "{}",
    pathParams: "{}",
    headers: "{}",
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
    mockScenario: "",
    mockLatencyMs: 0,
  };
}
