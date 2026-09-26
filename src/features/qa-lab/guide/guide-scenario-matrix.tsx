"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badges";
import { cn } from "@/shared/lib/cn";
import { QA_SCENARIOS, type QaScenarioKey } from "../qa-scenarios";

// Mismo mapeo de tono que el panel de docs in-app, para que el color de cada
// escenario signifique lo mismo aquí y en el lab.
const SCENARIO_TONE: Record<
  QaScenarioKey,
  "success" | "warning" | "critical" | "info"
> = {
  valid_payload: "success",
  without_auth: "warning",
  invalid_token: "warning",
  wrong_role_token: "critical",
  missing_tenant: "warning",
  missing_idempotency_key: "info",
  invalid_payload: "warning",
  custom: "info",
};

const AUTH_LABEL: Record<string, string> = {
  session: "Authorization: sesión",
  none: "Authorization: ninguno",
  invalid: "Authorization: token inválido",
  custom: "Authorization: token manual",
};

export function GuideScenarioMatrix() {
  const [activeKey, setActiveKey] = useState<QaScenarioKey>(
    QA_SCENARIOS[0].key,
  );
  const active =
    QA_SCENARIOS.find((scenario) => scenario.key === activeKey) ??
    QA_SCENARIOS[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {QA_SCENARIOS.map((scenario) => {
          const selected = scenario.key === activeKey;
          return (
            <button
              key={scenario.key}
              type="button"
              onClick={() => setActiveKey(scenario.key)}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border bg-white p-3 text-left transition-[border-color,box-shadow,transform] duration-150",
                selected
                  ? "border-atlas-accent shadow-glow"
                  : "border-atlas-border hover:-translate-y-0.5 hover:border-slate-300",
              )}
            >
              <Badge tone={SCENARIO_TONE[scenario.key]}>{scenario.label}</Badge>
              <p className="mt-2 text-[0.6875rem] leading-4 text-atlas-muted">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-atlas-border bg-atlas-soft p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={SCENARIO_TONE[active.key]}>{active.label}</Badge>
          <span className="text-xs text-atlas-muted">{active.description}</span>
        </div>
        <p className="mt-3 text-sm text-atlas-text">
          <span className="font-medium text-atlas-accent">
            Resultado esperado:
          </span>{" "}
          {active.expectedOutcome}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {active.patch ? (
            <>
              <HeaderPill
                state={active.patch.authMode === "session" ? "on" : "off"}
                label={AUTH_LABEL[active.patch.authMode] ?? "Authorization"}
              />
              <HeaderPill
                state={active.patch.includeTenantHeader ? "on" : "off"}
                label={
                  active.patch.includeTenantHeader
                    ? "x-tenant-id: incluido"
                    : "x-tenant-id: omitido"
                }
              />
              <HeaderPill
                state={active.patch.includeIdempotencyKey ? "on" : "off"}
                label={
                  active.patch.includeIdempotencyKey
                    ? "x-idempotency-key: incluido"
                    : "x-idempotency-key: omitido"
                }
              />
            </>
          ) : (
            <HeaderPill state="manual" label="Cada header se controla a mano" />
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderPill({
  state,
  label,
}: Readonly<{ state: "on" | "off" | "manual"; label: string }>) {
  return (
    <span
      className={cn(
        "rounded-md border bg-white px-2.5 py-1 font-mono text-[0.6875rem]",
        state === "on" && "border-emerald-200 text-emerald-700",
        state === "off" && "border-red-200 text-red-700 line-through",
        state === "manual" && "border-amber-200 text-amber-700",
      )}
    >
      {label}
    </span>
  );
}
