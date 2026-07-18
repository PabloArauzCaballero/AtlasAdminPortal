"use client";

import { useId, useState } from "react";
import type { QaJourneyStepSpec } from "./journey-types";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";

/**
 * Zona avanzada de un paso del journey (path/query/payload/headers/extract y
 * los HTTP esperados). Vive fuera de `journey-step-card.tsx` para no pasarse
 * del límite de 300 líneas por archivo.
 */
export function StepAdvancedFields({
  step,
  onChange,
}: Readonly<StepFieldProps>) {
  return (
    <div className="grid gap-3 rounded-lg bg-atlas-soft p-3 md:grid-cols-2">
      <JsonMiniField
        label="Path params"
        hint='Ej: { "customerId": "{{customerId}}" }'
        value={step.pathParams}
        onCommit={(value) => onChange({ ...step, pathParams: value })}
      />
      <JsonMiniField
        label="Query params"
        value={step.queryParams}
        onCommit={(value) => onChange({ ...step, queryParams: value })}
      />
      <JsonMiniField
        label="Payload"
        value={step.payload}
        onCommit={(value) => onChange({ ...step, payload: value })}
      />
      <JsonMiniField
        label="Headers"
        value={step.headers}
        onCommit={(value) =>
          onChange({ ...step, headers: value as Record<string, string> })
        }
      />
      <JsonMiniField
        label="Extraer variables"
        hint='Ej: { "customerId": "data.customerId" }'
        value={step.extract}
        onCommit={(value) =>
          onChange({ ...step, extract: value as Record<string, string> })
        }
      />
      <ExpectedStatusField step={step} onChange={onChange} />
    </div>
  );
}

/**
 * El texto tecleado vive aquí y no se re-deriva de `step.expectedStatusCodes`:
 * el ida y vuelta `parseStatusCodes(texto).join(", ")` se comía el separador
 * (al escribir la coma de "200, 201" el valor volvía como "200"), así que era
 * imposible declarar más de un status esperado. El padre sigue recibiendo la
 * lista ya parseada.
 */
function ExpectedStatusField({ step, onChange }: Readonly<StepFieldProps>) {
  const id = useId();
  const [text, setText] = useState(() =>
    (step.expectedStatusCodes ?? []).join(", "),
  );
  return (
    <div>
      <label htmlFor={id} className={MINI_LABEL_CLASS}>
        HTTP esperados
      </label>
      <Input
        id={id}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange({
            ...step,
            expectedStatusCodes: parseStatusCodes(event.target.value),
          });
        }}
        placeholder="200, 201"
        className="h-8 font-mono text-xs"
      />
    </div>
  );
}

function JsonMiniField({
  label,
  hint,
  value,
  onCommit,
}: Readonly<{
  label: string;
  hint?: string;
  value: unknown;
  onCommit: (value: Record<string, unknown>) => void;
}>) {
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState(() => stringifyOrEmpty(value));
  const [error, setError] = useState<string | null>(null);

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(null);
      onCommit({});
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("Debe ser un objeto JSON, ej: {}");
        return;
      }
      setError(null);
      onCommit(parsed as Record<string, unknown>);
    } catch {
      setError("JSON inválido");
    }
  }

  return (
    <div>
      <label htmlFor={id} className={MINI_LABEL_CLASS}>
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        spellCheck={false}
        placeholder={hint ?? "{}"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "min-h-16 w-full rounded-md border bg-white p-2 font-mono text-[11px]",
          error ? "border-red-400" : "border-atlas-border",
        )}
      />
      {error ? (
        <p id={errorId} className="mt-0.5 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Los seis controles de la zona avanzada comparten el placeholder "{}", así que
 * la etiqueta asociada es lo único que los distingue: con un `<span>` suelto un
 * lector de pantalla anunciaba seis veces "cuadro de edición" sin nombre.
 */
const MINI_LABEL_CLASS =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-atlas-muted";

function parseStatusCodes(text: string): number[] {
  return text
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function stringifyOrEmpty(value: unknown): string {
  if (
    !value ||
    (typeof value === "object" && Object.keys(value).length === 0)
  ) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

type StepFieldProps = {
  step: QaJourneyStepSpec;
  onChange: (step: QaJourneyStepSpec) => void;
};
