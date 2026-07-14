"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import { useTestProviderMutation } from "./hooks";

export function ProviderTestForm({
  providerCode,
}: Readonly<{ providerCode: string }>) {
  const [customerId, setCustomerId] = useState("1");
  const [queryType, setQueryType] = useState("IDENTITY_VERIFICATION");
  const [purpose, setPurpose] = useState("MANUAL_REVIEW");
  const [decisionStage, setDecisionStage] = useState("MANUAL_REVIEW");
  const [scenario, setScenario] = useState("");
  const [inputJson, setInputJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const test = useTestProviderMutation(providerCode);

  function submit() {
    let input: Record<string, unknown> = {};
    try {
      input = inputJson.trim() ? JSON.parse(inputJson) : {};
    } catch {
      setJsonError("El input debe ser JSON válido.");
      return;
    }
    setJsonError(null);
    test.mutate({
      customerId: customerId.trim() || undefined,
      queryType: queryType.trim() || undefined,
      purpose: purpose.trim() || undefined,
      decisionStage: decisionStage.trim() || undefined,
      scenario: scenario.trim() || undefined,
      input,
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-atlas-muted">
        Ejecuta una solicitud real de prueba contra el proveedor (útil para
        QA/debug). Usa valores por defecto razonables si dejás campos vacíos.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer ID">
          <Input
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </Field>
        <Field label="Query type">
          <Input
            value={queryType}
            onChange={(event) => setQueryType(event.target.value)}
          />
        </Field>
        <Field label="Propósito">
          <Input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </Field>
        <Field label="Etapa de decisión">
          <Input
            value={decisionStage}
            onChange={(event) => setDecisionStage(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Escenario (opcional, adapters mock)">
        <Input
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        />
      </Field>
      <Field label="Input (JSON)">
        <Textarea
          value={inputJson}
          onChange={(event) => setInputJson(event.target.value)}
          className="min-h-24 font-mono text-xs"
        />
      </Field>
      {jsonError ? (
        <ErrorState title="Formulario inválido" description={jsonError} />
      ) : null}
      {test.error ? (
        <ErrorState
          title="La prueba falló"
          description={
            isAtlasApiError(test.error)
              ? test.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(test.error) ? test.error.requestId : undefined
          }
        />
      ) : null}
      <Button
        variant="primary"
        isLoading={test.isPending}
        loadingText="Ejecutando…"
        onClick={submit}
      >
        Ejecutar prueba
      </Button>
      {test.data ? <JsonViewer title="Resultado" value={test.data} /> : null}
    </div>
  );
}
