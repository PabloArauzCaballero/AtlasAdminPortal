"use client";

import { Field, Input, Select } from "@/shared/components/ui/input";
import { describeMockScenario, MOCK_SCENARIO_OPTIONS } from "./mock-scenarios";

/**
 * Escenario y latencia a forzar contra el mock de proveedores externos. Vive aparte de
 * `qa-controls.tsx` (que ya rozaba el límite de 300 líneas del repo) y se muestra sólo cuando la
 * ruta base elegida es "Mock de proveedores externos" — ver `QaTargetControls`.
 */
export function MockScenarioFields({
  mockScenario,
  mockLatencyMs,
  onChange,
}: Readonly<{
  mockScenario?: string;
  mockLatencyMs?: number;
  onChange: (value: { mockScenario?: string; mockLatencyMs?: number }) => void;
}>) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <Field
        label="Escenario del mock"
        tooltip="Qué debe simular el proveedor en esta llamada (x-mock-scenario). Sólo aplica contra el mock de proveedores externos."
        hint={describeMockScenario(mockScenario ?? "")}
      >
        <Select
          name="mock-scenario"
          options={MOCK_SCENARIO_OPTIONS}
          value={mockScenario ?? ""}
          onChange={(value) => onChange({ mockScenario: value })}
        />
      </Field>
      <Field
        label="Latencia forzada (ms)"
        tooltip="Fija la latencia exacta del mock con x-mock-latency-ms. 0 = deja que el proveedor sortee su rango declarado."
        hint="Útil para una prueba de frontera que necesita un número exacto, no un rango aleatorio."
      >
        <Input
          type="number"
          min={0}
          max={30000}
          value={mockLatencyMs ?? 0}
          onChange={(event) =>
            onChange({ mockLatencyMs: Number(event.target.value) || 0 })
          }
        />
      </Field>
    </div>
  );
}
