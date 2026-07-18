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
import { isAtlasApiError } from "@/shared/api/errors";
import { jsonText } from "./json-utils";
import { findPayloadPreset } from "./payload-presets";
import { expectedStatusesText, parseEndpointStressForm } from "./qa-form";
import { StressLatencyChart } from "./latency-chart";
import { QaJsonFields } from "./qa-json-fields";
import { StressResultSummary } from "./qa-result-summary";
import { QaLogDownload } from "./qa-log-download";
import { useEndpointStressMutation } from "./hooks";
import {
  DEFAULT_STRESS_FORM,
  StressControls,
  StressSafetyHints,
  type StressFormState,
} from "./stress-controls";

export function StressTestCard({
  endpointId,
  endpoint,
}: Readonly<{ endpointId: string; endpoint?: EndpointItem }>) {
  const { hasPermission } = useAuth();
  const mutation = useEndpointStressMutation(endpoint);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<StressFormState>(DEFAULT_STRESS_FORM);
  const canExecute = hasPermission("systems.stress.execute");
  const isProd = form.environment === "PRODUCTION_READONLY";
  const canRun =
    canExecute && Boolean(endpointId) && !isProd && !mutation.isPending;

  useEffect(() => {
    setForm({
      ...DEFAULT_STRESS_FORM,
      payload: jsonText(endpoint?.minPayloadSchema),
      headers: jsonText(endpoint?.headersSchema),
      queryParams: jsonText(endpoint?.queryParamsSchema),
      pathParams: jsonText(endpoint?.pathParamsSchema),
      routeOverride: endpoint?.fullPath || endpoint?.routePath || "",
      expectedStatusCodes: expectedStatusesText(endpoint?.expectedStatusCodes),
      expectedHeaders: "{}",
      expectedJsonSubset: "",
      expectedBodyContains: "",
    });
  }, [endpoint]);

  function patchForm(value: Partial<StressFormState>) {
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

  /**
   * Se valida ANTES de abrir el diálogo (mismo patrón que `JourneyRunnerPanel`).
   * Validar dentro de `submit` dejaba el error pintado en la card, detrás del
   * backdrop `z-50` del propio diálogo: el operador pulsaba "Ejecutar" y no
   * pasaba nada visible (RESUELTO_ATLAS_F1_R7).
   */
  function tryExecute() {
    const parsed = parseEndpointStressForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  function submit() {
    const parsed = parseEndpointStressForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      setConfirmOpen(false);
      return;
    }
    setError(null);
    mutation.mutate(parsed.value, {
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
          title="3. Prueba de stress por endpoint"
          description="Ejecuta carga sintética con límites duros, pacing por RPS, métricas p50/p95/p99 y umbrales de aprobación. Producción queda bloqueada."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <StressSafetyHints endpoint={endpoint} />
        <StressControls form={form} endpoint={endpoint} onChange={patchForm} />
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
              label: "Payload base de entrada",
              value: form.payload,
              onChange: (value) => patchForm({ payload: value }),
            },
            {
              label: "Headers extra",
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
          ]}
        />
        {isProd ? (
          <ErrorState
            title="Stress bloqueado"
            description="No se permiten pruebas de stress desde la interfaz en producción."
          />
        ) : null}
        {error ? (
          <ErrorState title="Formulario inválido" description={error} />
        ) : null}
        {mutation.error ? <MutationError error={mutation.error} /> : null}
        <Button variant="primary" disabled={!canRun} onClick={tryExecute}>
          {form.dryRun ? "Previsualizar stress" : "Ejecutar stress real"}
        </Button>
        {mutation.data ? (
          <div className="space-y-3">
            <StressResultSummary result={mutation.data} />
            <StressLatencyChart points={mutation.data.latencyTimeline} />
            {mutation.data.pinoLogFileName && mutation.data.pinoLogLines ? (
              <QaLogDownload
                fileName={mutation.data.pinoLogFileName}
                lines={mutation.data.pinoLogLines}
              />
            ) : null}
            <JsonViewer title="Resultado completo" value={mutation.data} />
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        title={form.dryRun ? "Confirmar dry-run" : "Confirmar stress real"}
        description={`Se ${form.dryRun ? "previsualizará" : "ejecutará"} stress contra el endpoint #${endpointId}: ${form.targetRps} RPS, ${form.concurrency} concurrencia, ${form.durationSeconds}s.`}
        confirmText={form.dryRun ? "Previsualizar" : "Ejecutar"}
        isLoading={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </Card>
  );
}

function MutationError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo ejecutar el stress run."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
