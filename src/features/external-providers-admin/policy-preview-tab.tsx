"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import { usePolicyPreviewMutation } from "./hooks";

export function PolicyPreviewTab() {
  const [customerId, setCustomerId] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [queryType, setQueryType] = useState("IDENTITY_VERIFICATION");
  const [purpose, setPurpose] = useState("MANUAL_REVIEW");
  const [decisionStage, setDecisionStage] = useState("MANUAL_REVIEW");
  const [inputJson, setInputJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const preview = usePolicyPreviewMutation();

  const canSubmit =
    providerCode.trim().length >= 2 &&
    queryType.trim().length >= 3 &&
    purpose.trim().length >= 3;

  function submit() {
    let input: Record<string, unknown> = {};
    try {
      input = inputJson.trim() ? JSON.parse(inputJson) : {};
    } catch {
      setJsonError("El input debe ser JSON válido.");
      return;
    }
    setJsonError(null);
    preview.mutate({
      customerId: customerId.trim() || undefined,
      providerCode: providerCode.trim().toUpperCase(),
      queryType: queryType.trim(),
      purpose: purpose.trim(),
      decisionStage: decisionStage.trim(),
      input,
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-atlas-muted">
        Simula qué pasaría si se ejecutara esta solicitud (¿se bloquea por
        costo? ¿requiere aprobación manual?) sin llamar realmente al proveedor.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer ID (opcional)">
          <Input
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </Field>
        <Field label="Código de proveedor">
          <Input
            value={providerCode}
            onChange={(event) => setProviderCode(event.target.value)}
            placeholder="ej: SEGIP"
            className="font-mono text-xs"
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
      </div>
      <Field label="Etapa de decisión">
        <Input
          value={decisionStage}
          onChange={(event) => setDecisionStage(event.target.value)}
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
      {preview.error ? (
        <ErrorState
          title="No se pudo previsualizar la política"
          description={
            isAtlasApiError(preview.error)
              ? preview.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(preview.error) ? preview.error.requestId : undefined
          }
        />
      ) : null}
      <Button
        variant="primary"
        disabled={!canSubmit}
        isLoading={preview.isPending}
        loadingText="Simulando…"
        onClick={submit}
      >
        Previsualizar política
      </Button>
      {preview.data ? (
        <JsonViewer title="Resultado" value={preview.data} />
      ) : null}
    </div>
  );
}
