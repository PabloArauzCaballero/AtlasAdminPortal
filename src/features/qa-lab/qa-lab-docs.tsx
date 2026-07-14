"use client";

import { useState } from "react";
import {
  FlaskConical,
  KeySquare,
  Layers,
  Lock,
  Radar,
  Workflow,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { QA_SCENARIOS } from "./qa-scenarios";

const SCENARIO_TONE: Record<
  string,
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

export function QaLabDocsPanel() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-2 text-white">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-atlas-text">
              Cómo funciona el QA Live Lab
            </p>
            <p className="text-xs text-atlas-muted">
              rawFetch directo · matriz de escenarios · contrato de respuesta
            </p>
          </div>
        </div>
        <Badge tone="info">{expanded ? "Ocultar" : "Ver guía"}</Badge>
      </button>
      {expanded ? (
        <CardContent className="grid gap-4 border-t border-atlas-border pt-4 md:grid-cols-2 xl:grid-cols-3">
          <DocCard
            icon={<Radar className="h-4 w-4" />}
            title="Target dinámico"
            points={[
              "LOCAL / STAGING / PRODUCTION_READONLY, host manual con validación http(s).",
              "PRODUCTION_READONLY solo permite dry-run: cualquier ejecución real queda bloqueada.",
            ]}
          />
          <DocCard
            icon={<Workflow className="h-4 w-4" />}
            title="Escenarios de prueba"
            points={[
              "Presets sobre auth, tenant e idempotencia — sin editar headers a mano.",
              "Ver matriz completa abajo.",
            ]}
          />
          <DocCard
            icon={<KeySquare className="h-4 w-4" />}
            title="Headers gestionados"
            points={[
              "Authorization según el modo elegido (sesión, ninguno, inválido, manual).",
              "x-tenant-id automático desde la sesión salvo que el escenario lo desactive.",
              "x-idempotency-key UUID por request en métodos mutables.",
            ]}
          />
          <DocCard
            icon={<Layers className="h-4 w-4" />}
            title="Contrato de respuesta"
            points={[]}
          >
            <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100">
              {`{ requestId, data, timestamp }
{ requestId, error: { code, message }, timestamp }`}
            </pre>
          </DocCard>
          <DocCard
            icon={<Lock className="h-4 w-4" />}
            title="Seguridad no negociable"
            points={[
              "Tokens nunca persisten en almacenamiento del navegador.",
              "Authorization/cookies enmascarados en logs y resultados.",
              'Mutación real fuera de LOCAL exige tildar el checkbox + escribir "EJECUTAR".',
              "Load probe: tope duro de 10.000 requests, bloqueado en producción.",
            ]}
          />
          <div className="rounded-xl border border-atlas-border bg-atlas-soft p-4 md:col-span-2 xl:col-span-3">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-atlas-text">
              <Workflow className="h-3.5 w-3.5" /> Matriz de escenarios
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {QA_SCENARIOS.map((scenario) => (
                <div
                  key={scenario.key}
                  className="rounded-lg border border-atlas-border bg-white p-2.5"
                >
                  <Badge tone={SCENARIO_TONE[scenario.key] ?? "default"}>
                    {scenario.label}
                  </Badge>
                  <p className="mt-1.5 text-[11px] leading-4 text-atlas-muted">
                    {scenario.description}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-atlas-text">
                    → {scenario.expectedOutcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function DocCard({
  icon,
  title,
  points,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  points: string[];
  children?: React.ReactNode;
}>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg bg-atlas-soft p-1.5 text-atlas-text">
          {icon}
        </div>
        <p className="text-sm font-semibold text-atlas-text">{title}</p>
      </div>
      {points.length ? (
        <ul className="space-y-1.5 text-xs leading-5 text-atlas-muted">
          {points.map((point) => (
            <li key={point} className="flex gap-1.5">
              <span className="text-atlas-text">·</span>
              {point}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
