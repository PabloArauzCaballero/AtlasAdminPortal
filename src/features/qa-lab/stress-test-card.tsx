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
import { defaultQaEnvironment, isProductionTarget } from "./environment";
import { useQaTestData } from "./fakers/use-fakers";
import { isMockEndpointId } from "./mock-provider-endpoints";
import { expectedStatusesText, parseEndpointStressForm } from "./qa-form";
import { StressLatencyChart } from "./latency-chart";
import { PresetBar } from "./preset-bar";
import { QaJsonFields } from "./qa-json-fields";
import { StressResultSummary } from "./qa-result-summary";
import { QaLogDownload } from "./qa-log-download";
import { useEndpointStressMutation } from "./hooks";
import { StressDataOptions, useStressRotation } from "./stress-data-options";
import {
  DEFAULT_STRESS_FORM,
  StressControls,
  StressSafetyHints,
  type StressFormState,
} from "./stress-controls";
import { useGeneratedEntries } from "./use-generated-entries";

/** Doble confirmación: carga real que puede cambiar datos, fuera de tu máquina. */
export function stressNeedsTypedConfirmation(form: StressFormState): boolean {
  return !form.dryRun && form.allowMutations && form.environment !== "LOCAL";
}

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
  const isProd = isProductionTarget(form.environment);
  const canRun =
    canExecute && Boolean(endpointId) && !isProd && !mutation.isPending;

  function patchForm(value: Partial<StressFormState>) {
    setForm((current) => ({ ...current, ...value }));
  }

  // Primero se reinicia el formulario y DESPUÉS lo rellena el generador (`useGeneratedEntries`):
  // los efectos corren en orden de declaración.
  useEffect(() => {
    const isMock = Boolean(endpoint && isMockEndpointId(endpoint.endpointId));
    setForm({
      ...DEFAULT_STRESS_FORM,
      environment: defaultQaEnvironment(),
      // Ver el mismo comentario en `endpoint-test-card.tsx`: revela los controles de
      // escenario/latencia del mock; la URL ya es absoluta y no depende de esto para resolver.
      baseRouteKey: isMock
        ? "MOCK_PROVIDERS"
        : DEFAULT_STRESS_FORM.baseRouteKey,
      routeOverride: endpoint?.fullPath || endpoint?.routePath || "",
      expectedStatusCodes: expectedStatusesText(endpoint?.expectedStatusCodes),
    });
  }, [endpoint]);

  const testData = useQaTestData();
  const generated = useGeneratedEntries({
    endpoint,
    data: testData,
    form,
    patchForm,
  });
  const rotation = useStressRotation({ endpoint, data: testData });

  function tryExecute() {
    const parsed = parseEndpointStressForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function submit() {
    const parsed = parseEndpointStressForm(form);
    if (!parsed.ok) {
      setError(parsed.error);
      setConfirmOpen(false);
      return;
    }
    const payloads = await rotation.build(parsed.value.maxRequests, form);
    if (!payloads.ok) {
      setError(payloads.error);
      setConfirmOpen(false);
      return;
    }
    setError(null);
    mutation.mutate(
      { ...parsed.value, payloadRotation: payloads.value },
      {
        onSuccess: () => setConfirmOpen(false),
        onError: () => setConfirmOpen(false),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Prueba de carga"
          description="Envía muchas peticiones seguidas desde tu navegador, con topes firmes, y mide el tiempo de respuesta (mediana, p95 y p99: el tiempo que no supera el 95 % o el 99 % de las peticiones) y los errores. En producción está bloqueada."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <StressSafetyHints endpoint={endpoint} />
        <StressControls form={form} endpoint={endpoint} onChange={patchForm} />
        <StressDataOptions rotation={rotation} data={testData} />
        <PresetBar
          preset={generated.preset}
          onApply={() => generated.applyPreset()}
          notice={generated.notice}
        />
        <QaJsonFields
          fields={[
            {
              label: "Datos de entrada base",
              tooltip:
                "El cuerpo (JSON) de cada petición; con «Datos distintos por petición» sólo se usa si el generador no responde.",
              value: form.payload,
              onChange: (value) => {
                generated.markManual();
                patchForm({ payload: value });
              },
            },
            {
              label: "Cabeceras extra",
              tooltip:
                "Cabeceras (JSON) añadidas a cada petición; no pongas secretos.",
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
          ]}
        />
        {isProd ? (
          <ErrorState
            title="Carga bloqueada"
            description="No se permiten pruebas de carga contra producción desde el portal."
          />
        ) : null}
        {error ? (
          <ErrorState title="Formulario inválido" description={error} />
        ) : null}
        {mutation.error ? <MutationError error={mutation.error} /> : null}
        <Button
          variant="primary"
          disabled={!canRun}
          onClick={tryExecute}
          data-tutorial-id="qa-lab-run-stress"
        >
          {form.dryRun ? "Previsualizar carga" : "Lanzar carga real"}
        </Button>
        {mutation.data ? (
          <div className="space-y-3" data-tutorial-id="qa-lab-stress-result">
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
        title={
          form.dryRun ? "Confirmar previsualización" : "Confirmar carga real"
        }
        description={`Se ${form.dryRun ? "previsualizará" : "lanzará"} carga contra la operación #${endpointId}: ${form.targetRps} peticiones por segundo, ${form.concurrency} a la vez, ${form.durationSeconds}s.`}
        confirmText={form.dryRun ? "Previsualizar" : "Lanzar"}
        isLoading={mutation.isPending || rotation.pending}
        typedConfirmationPhrase={
          stressNeedsTypedConfirmation(form) ? "EJECUTAR" : undefined
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
      />
    </Card>
  );
}

function MutationError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error) ||
        (error instanceof Error && !(error instanceof TypeError))
          ? error.message
          : "No se pudo lanzar la prueba de carga."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
