"use client";

import { Field, Input, Textarea } from "@/shared/components/ui/input";

/**
 * Lo que hacía falta para que "Encolar" fuera configurable de verdad.
 *
 * Antes `queueRun()` mandaba siempre `dryRun: true, config: {}, headers: {}` — el botón se
 * llamaba literalmente "Encolar dry-run" y no había forma de decirle al worker qué payload
 * mandar, contra qué host, ni pedirle un escenario del mock de proveedores externos. El worker
 * (`SystemsStressExecutorService`) SÍ lee `config.payload`, `config.timeoutMs`,
 * `config.requestBudget` y reenvía `headers` tal cual al objetivo — sólo faltaba el formulario.
 */
export type QueueRunAdvancedState = {
  dryRun: boolean;
  baseUrl: string;
  payloadText: string;
  headersText: string;
  timeoutMs: number;
  requestBudget: number;
};

export const DEFAULT_QUEUE_RUN_ADVANCED: QueueRunAdvancedState = {
  dryRun: true,
  baseUrl: "",
  payloadText: "{}",
  headersText: "{}",
  timeoutMs: 10000,
  requestBudget: 1000,
};

export function QueueRunAdvancedFields({
  value,
  onChange,
  endpointBaseUrl,
}: Readonly<{
  value: QueueRunAdvancedState;
  onChange: (patch: Partial<QueueRunAdvancedState>) => void;
  endpointBaseUrl: string | null;
}>) {
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 rounded-lg border border-atlas-border p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.dryRun}
          onChange={(event) => onChange({ dryRun: event.target.checked })}
        />
        <span>
          <strong>Dry-run / modo seguro</strong>
          <span className="block text-xs text-atlas-muted">
            Valida la URL y el plan, sin mandar tráfico real.
          </span>
        </span>
      </label>
      <Field
        label="Base URL"
        tooltip="Host contra el que corre la carga. Vacío = usa el host del endpoint del perfil. Para probar contra el mock de proveedores externos, pega su URL (ej.: http://localhost:4010/mock)."
        hint={
          endpointBaseUrl
            ? `Vacío usa el del endpoint: ${endpointBaseUrl}`
            : "Vacío usa el host del endpoint del perfil, si lo tiene registrado; si no, la corrida real falla pidiendo esta URL."
        }
      >
        <Input
          value={value.baseUrl}
          onChange={(event) => onChange({ baseUrl: event.target.value })}
          placeholder={endpointBaseUrl || "https://host/api/v1"}
          className="font-mono"
        />
      </Field>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Field
          label="Timeout por request (ms)"
          tooltip="Milisegundos que espera cada petición antes de contarla como error de transporte."
        >
          <Input
            type="number"
            min={1000}
            max={120000}
            value={value.timeoutMs}
            onChange={(event) =>
              onChange({ timeoutMs: Number(event.target.value) || 1000 })
            }
          />
        </Field>
        <Field
          label="Tope de requests"
          tooltip="Techo absoluto de peticiones para esta corrida, por encima de RPS × duración del perfil."
        >
          <Input
            type="number"
            min={1}
            max={50000}
            value={value.requestBudget}
            onChange={(event) =>
              onChange({ requestBudget: Number(event.target.value) || 1 })
            }
          />
        </Field>
      </div>
      <Field
        label="Payload"
        tooltip="Cuerpo JSON que manda cada petición de la carga (config.payload)."
      >
        <Textarea
          value={value.payloadText}
          onChange={(event) => onChange({ payloadText: event.target.value })}
          rows={4}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Headers extra"
        tooltip={
          'Cabeceras JSON que se reenvían tal cual al objetivo. Para forzar un escenario del mock de proveedores externos: {"x-mock-scenario": "provider_down"}.'
        }
        hint="El worker las manda literalmente: no pongas Authorization/Cookie aquí, viajarían como [REDACTED]."
      >
        <Textarea
          value={value.headersText}
          onChange={(event) => onChange({ headersText: event.target.value })}
          rows={3}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </Field>
    </div>
  );
}

export function parseQueueRunAdvanced(
  value: QueueRunAdvancedState,
):
  | { ok: true; payload: unknown; headers: Record<string, string> }
  | { ok: false; error: string } {
  let payload: unknown;
  let headers: Record<string, string>;
  try {
    payload = JSON.parse(value.payloadText || "{}");
  } catch {
    return { ok: false, error: "El payload no es JSON válido." };
  }
  try {
    headers = JSON.parse(value.headersText || "{}");
  } catch {
    return { ok: false, error: "Los headers no son JSON válido." };
  }
  if (
    typeof headers !== "object" ||
    headers === null ||
    Array.isArray(headers)
  ) {
    return { ok: false, error: "Los headers deben ser un objeto JSON." };
  }
  return { ok: true, payload, headers };
}
