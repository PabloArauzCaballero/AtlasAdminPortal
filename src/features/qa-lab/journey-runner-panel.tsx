"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useEndpointsByIds } from "@/features/systems/hooks";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  JourneyRunnerConfig,
  JourneyRunnerConfigFields,
} from "./journey-runner-config-form";
import { JourneyStepsEditor } from "./journey-steps-editor";
import { parseSteps } from "./journey-form";
import { runJourney } from "./journey-runner";
import { JourneyStepResults } from "./journey-step-results";
import { JOURNEY_EXAMPLE_SPEC } from "./journey-types";

const DEFAULT_STEPS_TEXT = JSON.stringify(JOURNEY_EXAMPLE_SPEC, null, 2);

const DEFAULT_CONFIG: JourneyRunnerConfig = {
  environment: "LOCAL",
  baseRouteKey: "ENVIRONMENT_DEFAULT",
  customHostUrl: "",
  dryRun: true,
  timeoutMs: 20000,
  authMode: "session",
  customAuthToken: "",
  deviceProfile: "none",
  includeTenantHeader: true,
  includeIdempotencyKey: true,
};

export function JourneyRunnerPanel() {
  const [stepsText, setStepsText] = useState(DEFAULT_STEPS_TEXT);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [config, setConfig] = useState<JourneyRunnerConfig>(DEFAULT_CONFIG);

  function patchConfig(value: Partial<JourneyRunnerConfig>) {
    setConfig((current) => ({ ...current, ...value }));
  }

  const parsedSteps = useMemo(() => parseSteps(stepsText), [stepsText]);
  const endpointIds = useMemo(
    () =>
      parsedSteps.ok ? parsedSteps.value.map((step) => step.endpointId) : [],
    [parsedSteps],
  );
  const endpoints = useEndpointsByIds(endpointIds);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!parsedSteps.ok) throw new Error(parsedSteps.error);
      return runJourney(parsedSteps.value, config, endpoints.byId);
    },
    onSuccess: () => setConfirmOpen(false),
  });

  function tryExecute() {
    if (!parsedSteps.ok) {
      setParseError(parsedSteps.error);
      return;
    }
    setParseError(null);
    setConfirmOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Journey Runner (pruebas encadenadas)"
          description="Ejecuta una secuencia de endpoints en orden, extrayendo valores de una respuesta para usarlos en los siguientes pasos con {{variable}}. No es una prueba unitaria: valida flujos completos de negocio."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <JourneyRunnerConfigFields config={config} onChange={patchConfig} />
        <JourneyStepsEditor
          stepsText={stepsText}
          onStepsTextChange={setStepsText}
          parsedSteps={parsedSteps}
          onParseError={setParseError}
        />
        {parseError ? (
          <ErrorState title="JSON de pasos inválido" description={parseError} />
        ) : null}
        {runMutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.message
                : String(runMutation.error)
            }
          />
        ) : null}
        <Button
          variant="primary"
          isLoading={runMutation.isPending || endpoints.isLoading}
          loadingText="Ejecutando journey…"
          disabled={!parsedSteps.ok}
          onClick={tryExecute}
        >
          {config.dryRun ? "Previsualizar journey" : "Ejecutar journey real"}
        </Button>
        {runMutation.data ? (
          <JourneyStepResults result={runMutation.data} />
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        title={config.dryRun ? "Confirmar dry-run" : "Confirmar journey real"}
        description={`Se ${config.dryRun ? "previsualizarán" : "ejecutarán"} ${parsedSteps.ok ? parsedSteps.value.length : 0} pasos encadenados en ${config.environment}.`}
        confirmText={config.dryRun ? "Previsualizar" : "Ejecutar"}
        isLoading={runMutation.isPending}
        typedConfirmationPhrase={
          !config.dryRun && config.environment !== "LOCAL"
            ? "EJECUTAR"
            : undefined
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => runMutation.mutate()}
      />
    </Card>
  );
}
