import { Field, Input, Select } from "@/shared/components/ui/input";
import { AUTH_MODE_OPTIONS } from "./qa-lab-options";
import { getQaScenario, QA_SCENARIOS } from "./qa-scenarios";
import type { CommonLabFormState } from "./qa-controls";
import { CheckBox } from "./qa-controls";
import type { QaAuthMode } from "./types";

/**
 * Escenario de prueba: al elegirlo cambia la credencial, las cabeceras Y los códigos esperados.
 * «Datos inválidos» además pide al generador un caso inválido (`onInvalidCase`).
 */
export function QaScenarioControls({
  form,
  onChange,
  contractStatuses = "200",
  onInvalidCase,
}: Readonly<{
  form: CommonLabFormState;
  onChange: (value: Partial<CommonLabFormState>) => void;
  /** Los códigos que declara el catálogo, para volver a ellos en «Datos válidos». */
  contractStatuses?: string;
  onInvalidCase?: () => void;
}>) {
  const active = getQaScenario(form.scenario ?? "valid_payload");
  return (
    <div className="space-y-3 rounded-xl border border-atlas-border bg-atlas-soft p-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Escenario de prueba"
          tooltip="Caso común ya preparado: ajusta la credencial, las cabeceras y los códigos esperados; «Datos inválidos» carga además un caso inválido."
          hint="Preconfigura credencial, cabeceras y resultado esperado para un caso común."
        >
          <Select
            name="escenario"
            value={active.key}
            options={QA_SCENARIOS.map((scenario) => ({
              value: scenario.key,
              label: scenario.label,
              description: `${scenario.description} Resultado esperado: ${scenario.expectedOutcome}`,
            }))}
            onChange={(valor) => {
              const scenario = getQaScenario(valor);
              const statuses =
                scenario.expectedStatusCodes === "contract"
                  ? contractStatuses
                  : scenario.expectedStatusCodes;
              onChange({
                scenario: scenario.key,
                ...(scenario.patch ?? {}),
                ...(statuses ? { expectedStatusCodes: statuses } : {}),
              });
              if (scenario.loadsInvalidCase) onInvalidCase?.();
            }}
          />
        </Field>
        <Field
          label="Credencial de la petición"
          tooltip="Con qué credencial sale la petición; sirve para probar accesos sin cambiar de sesión."
          hint="Con qué se identifica la petición, sin importar tu sesión actual."
        >
          <Select
            name="auth-mode"
            value={form.authMode}
            options={AUTH_MODE_OPTIONS}
            onChange={(valor) => onChange({ authMode: valor as QaAuthMode })}
          />
        </Field>
      </div>
      {form.authMode === "custom" ? (
        <Field
          label="Token de otro actor"
          tooltip="Token de acceso de otro actor, sin el prefijo Bearer. No lo guardes en notas."
          hint="Pega el token de otro actor (cliente, comercio, analista…) para probar qué puede hacer. Sin token el laboratorio no envía."
        >
          <Input
            value={form.customAuthToken}
            onChange={(event) =>
              onChange({ customAuthToken: event.target.value })
            }
            placeholder="eyJhbGciOi..."
            className="font-mono"
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Enviar la cabecera de empresa (x-tenant-id)"
          checked={form.includeTenantHeader}
          onChange={(value) => onChange({ includeTenantHeader: value })}
        />
        <CheckBox
          label="Enviar clave anti-duplicados (x-idempotency-key)"
          checked={form.includeIdempotencyKey}
          onChange={(value) => onChange({ includeIdempotencyKey: value })}
        />
      </div>
    </div>
  );
}
