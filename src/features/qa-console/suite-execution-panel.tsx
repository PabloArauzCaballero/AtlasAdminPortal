"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { useRunTestSuiteMutation, useTestRun } from "@/features/systems/hooks";
import type { TestSuite } from "@/features/systems/types";
import { useAuth } from "@/shared/auth/auth-context";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  DEFAULT_HEADERS,
  DEFAULT_LOCAL_BASE_URL,
  normalizeExecutionEnvironments,
  normalizeHeaders,
  parseJsonRecord,
  validateExecutionForm,
} from "./suite-execution-utils";

export function SuiteExecutionPanel({
  suite,
  suiteId,
}: Readonly<{ suite: TestSuite; suiteId: string }>) {
  const { hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [environment, setEnvironment] = useState("LOCAL");
  const [dryRun, setDryRun] = useState(true);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_LOCAL_BASE_URL);
  const [timeoutMs, setTimeoutMs] = useState(10_000);
  const [headersText, setHeadersText] = useState("{}");
  const [configText, setConfigText] = useState("{}");
  const [formError, setFormError] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState("");
  const runMutation = useRunTestSuiteMutation(suiteId);
  const liveRun = useTestRun(lastRunId, { live: true });

  const canExecute = hasPermission("systems.qa.execute");
  const allowedEnvironments = useMemo(
    () =>
      normalizeExecutionEnvironments(
        suite.environmentScope,
        suite.isSafeForProduction,
      ),
    [suite.environmentScope, suite.isSafeForProduction],
  );
  const canSubmit =
    canExecute &&
    suite.isEnabled &&
    allowedEnvironments.includes(environment) &&
    (dryRun || baseUrl.trim().length > 0);

  useEffect(() => {
    if (!allowedEnvironments.includes(environment)) {
      setEnvironment(allowedEnvironments[0] ?? "LOCAL");
    }
  }, [allowedEnvironments, environment]);

  useEffect(() => {
    if (environment === "PRODUCTION_READONLY") setDryRun(true);
  }, [environment]);

  function openConfirm() {
    const validation = validateExecutionForm({
      dryRun,
      baseUrl,
      headersText,
      configText,
    });
    setFormError(validation);
    if (!validation) setConfirmOpen(true);
  }

  function executeSuite() {
    const headers = parseJsonRecord(headersText);
    const config = parseJsonRecord(configText);
    runMutation.mutate(
      {
        environment,
        dryRun,
        baseUrl: dryRun ? undefined : baseUrl.trim(),
        timeoutMs,
        config,
        headers: normalizeHeaders(headers),
      },
      {
        onSuccess: (result) => {
          setConfirmOpen(false);
          if (result.runId) setLastRunId(result.runId);
        },
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <Field label="Ambiente">
            <Select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              {allowedEnvironments.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Timeout por step"
            hint="El backend también aplica sus límites internos."
          >
            <Input
              type="number"
              min={1_000}
              max={60_000}
              step={1_000}
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(Number(event.target.value))}
            />
          </Field>
          <label className="flex items-center gap-2 rounded-lg border border-atlas-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              disabled={environment === "PRODUCTION_READONLY"}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Dry-run
          </label>
          <Field
            label="Base URL para corrida real"
            hint="Usa el host raiz; los steps normalmente ya incluyen /api/v1."
          >
            <Input
              value={baseUrl}
              disabled={dryRun}
              placeholder={DEFAULT_LOCAL_BASE_URL}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Field
            label="Headers JSON"
            hint="No se guardan secretos en el portal."
          >
            <Textarea
              value={headersText}
              placeholder={DEFAULT_HEADERS}
              onChange={(event) => setHeadersText(event.target.value)}
            />
          </Field>
          <Field
            label="Config JSON"
            hint="Variables consumidas por templates de la suite."
          >
            <Textarea
              value={configText}
              onChange={(event) => setConfigText(event.target.value)}
            />
          </Field>
        </div>

        {formError ? (
          <ErrorState title="Config invalida" description={formError} />
        ) : null}
        {runMutation.error ? (
          <ErrorState
            title="No se pudo ejecutar la suite."
            description={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.message
                : "La corrida fue rechazada por el backend."
            }
            requestId={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.requestId
                : undefined
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            disabled={!canSubmit}
            isLoading={runMutation.isPending}
            onClick={openConfirm}
            title={!canExecute ? "Requiere systems.qa.execute" : undefined}
          >
            <Play className="h-4 w-4" />
            Ejecutar suite
          </Button>
          {lastRunId ? (
            <Button
              variant="secondary"
              onClick={() => void liveRun.refetch()}
              isLoading={liveRun.isFetching}
              loadingText="Actualizando…"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar run
            </Button>
          ) : null}
        </div>

        {runMutation.data ? <SubmittedRun result={runMutation.data} /> : null}
        {lastRunId ? <LiveRunStatus run={liveRun} /> : null}

        <ConfirmDialog
          open={confirmOpen}
          title="Confirmar ejecucion QA"
          description={`Se ejecutara la suite en ${environment} con dryRun=${String(dryRun)}. La accion quedara auditada y el backend validara allowlist/SSRF antes de llamar al host.`}
          confirmText="Ejecutar"
          isLoading={runMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={executeSuite}
        />
      </CardContent>
    </Card>
  );
}

function SubmittedRun({
  result,
}: Readonly<{ result: { runId?: string; status?: string } & object }>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-atlas-soft p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={result.status ?? "SUBMITTED"} />
        {result.runId ? (
          <Link
            className="text-sm font-medium text-blue-700 hover:underline"
            href={`/internal/qa/runs/${result.runId}`}
          >
            Ver ejecucion #{result.runId}
          </Link>
        ) : null}
      </div>
      <div className="mt-3">
        <JsonViewer title="Respuesta del backend" value={result} />
      </div>
    </div>
  );
}

function LiveRunStatus({
  run,
}: Readonly<{ run: ReturnType<typeof useTestRun> }>) {
  if (run.isLoading) return <LoadingSkeleton rows={2} />;
  if (!run.data) return null;
  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-atlas-text">
          Estado actual
        </span>
        <StatusBadge value={run.data.run.status} />
      </div>
      <KeyValueGrid
        items={[
          { label: "Run", value: `#${run.data.run.runId}`, mono: true },
          { label: "Ambiente", value: run.data.run.environment },
          {
            label: "Duracion",
            value: `${formatNumber(run.data.run.durationMs)} ms`,
          },
          { label: "Inicio", value: formatDateTime(run.data.run.startedAt) },
          { label: "Fin", value: formatDateTime(run.data.run.finishedAt) },
        ]}
      />
    </div>
  );
}
