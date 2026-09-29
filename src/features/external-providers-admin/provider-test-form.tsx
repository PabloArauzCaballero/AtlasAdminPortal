"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useProviderCostPolicies, useTestProviderMutation } from "./hooks";
import {
  leerJsonObjeto,
  opcionesDeTipoDeConsulta,
  tipoDeConsultaDePrueba,
} from "./provider-display";
import { RequestResultCard } from "./request-result-card";

export function ProviderTestForm({
  providerCode,
}: Readonly<{ providerCode: string }>) {
  // Vacío a propósito: un cliente inventado («1») rompía la prueba en toda base donde no existe.
  const [customerId, setCustomerId] = useState("");
  // El tipo sale de las políticas del proveedor: con un tipo sin política la prueba no ejercita la
  // política que se aplica de verdad. `null` = el usuario no eligió todavía.
  const politicas = useProviderCostPolicies(providerCode);
  const [queryTypeElegido, setQueryType] = useState<string | null>(null);
  const queryType = queryTypeElegido ?? tipoDeConsultaDePrueba(politicas.data);
  const [purpose, setPurpose] = useState("MANUAL_REVIEW");
  const [decisionStage, setDecisionStage] = useState("MANUAL_REVIEW");
  const [scenario, setScenario] = useState("");
  const [inputJson, setInputJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const test = useTestProviderMutation(providerCode);

  function submit() {
    const lectura = leerJsonObjeto(inputJson);
    if (!lectura.ok) {
      setJsonError(lectura.error);
      return;
    }
    setJsonError(null);
    const input = lectura.value;
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
        revisar o depurar). Usa valores por defecto razonables si dejas campos
        vacíos.
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field
          tooltip="Cliente sobre el que se lanza la consulta de prueba. Vacío: prueba sin cliente, con datos sintéticos."
          label="Cliente (número)"
          hint="Opcional. Si pones uno, debe existir y tener consentimiento."
        >
          <Input
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </Field>
        <Field
          tooltip="Qué se le pide al proveedor. Sale de sus políticas de costo, para probar la que se aplica de verdad."
          label="Tipo de consulta"
        >
          <Select
            name="queryType"
            value={queryType}
            onChange={setQueryType}
            options={opcionesDeTipoDeConsulta(politicas.data, queryType)}
          />
        </Field>
        <Field
          tooltip="Finalidad declarada de la consulta de prueba, p. ej. onboarding."
          label="Propósito"
        >
          <Input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </Field>
        <Field
          tooltip="Etapa del ciclo del cliente para la prueba, p. ej. ONBOARDING."
          label="Etapa de decisión"
        >
          <Input
            value={decisionStage}
            onChange={(event) => setDecisionStage(event.target.value)}
          />
        </Field>
      </div>
      <Field
        tooltip="Caso que fuerza el simulador del proveedor, p. ej. «proveedor caído» para ver cómo responde."
        label="Escenario (opcional, sólo en simulado)"
      >
        <Input
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        />
      </Field>
      <Field
        tooltip="Los datos que se envían al proveedor, como objeto JSON entre llaves."
        label="Datos de la consulta (JSON)"
      >
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
        disabled={politicas.isLoading}
        onClick={submit}
      >
        <Play className="h-4 w-4" aria-hidden />
        Ejecutar prueba
      </Button>
      {test.data ? (
        <RequestResultCard title="Respuesta del proveedor" result={test.data} />
      ) : null}
    </div>
  );
}
