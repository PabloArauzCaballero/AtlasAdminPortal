"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLabEndpointsByIds as useEndpointsByIds } from "./endpoint-lookup";
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
import { runJourneyBatch } from "./journey-runner";
import { JourneyBatchResults } from "./journey-batch-results";
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
  mockScenario: "",
  mockLatencyMs: 0,
  iterations: 1,
  concurrency: 1,
  seed: "qa-base",
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
      // Diagnóstico de UN recorrido: el lote de N personas ya no sale del navegador (dependía de
      // esta pestaña y reutilizaba la sesión del operador para todas). Va por el catálogo.
      return runJourneyBatch(
        parsedSteps.value,
        { ...config, iterations: 1, concurrency: 1 },
        endpoints.byId,
      );
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
          title="Editor de pasos · diagnóstico de un recorrido"
          description="Ejecuta desde este navegador UNA secuencia de pasos escrita a mano, extrayendo valores de una respuesta para usarlos en los siguientes con {{variable}}. Sirve para depurar un recorrido; para ejecutar N personas usa los recorridos precargados."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <JourneyRunnerConfigFields
          config={config}
          onChange={patchConfig}
          singleRun
        />
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
        {/*
          Dos botones, no un checkbox que cambia el texto de uno solo: el reporte que motivó este
          cambio era justamente "el journey en ningún momento deja ejecutar, muestra el preview
          pero no deja ejecutar" — con un solo botón cuyo rótulo depende de un checkbox lejano, es
          fácil pulsar "Ejecutar journey real" sin haber notado que Dry-run seguía marcado.
        */}
        <div className="flex flex-wrap gap-3">
          <Button
            isLoading={
              config.dryRun && (runMutation.isPending || endpoints.isLoading)
            }
            loadingText="Previsualizando…"
            disabled={!parsedSteps.ok}
            onClick={() => {
              patchConfig({ dryRun: true });
              tryExecute();
            }}
          >
            Previsualizar (dry-run)
          </Button>
          <Button
            variant="primary"
            isLoading={
              !config.dryRun && (runMutation.isPending || endpoints.isLoading)
            }
            loadingText="Ejecutando journey real…"
            disabled={!parsedSteps.ok}
            onClick={() => {
              patchConfig({ dryRun: false });
              tryExecute();
            }}
          >
            Ejecutar journey real
          </Button>
        </div>
        {runMutation.data ? (
          <JourneyBatchResults batch={runMutation.data} />
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        title={config.dryRun ? "Confirmar dry-run" : "Confirmar journey real"}
        description={
          config.dryRun
            ? `Se previsualizarán ${parsedSteps.ok ? parsedSteps.value.length : 0} pasos encadenados en ${config.environment}. No se manda tráfico real.`
            : `Se ejecutarán de verdad ${parsedSteps.ok ? parsedSteps.value.length : 0} pasos encadenados en ${config.environment}, ${config.iterations} vez${config.iterations === 1 ? "" : "es"} (${config.iterations} persona${config.iterations === 1 ? "" : "s"} simulada${config.iterations === 1 ? "" : "s"}, semilla «${config.seed}»).`
        }
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
