"use client";

import { useState } from "react";
import { ArrowDown, Copy, Check, Link2 } from "lucide-react";
import { MethodBadge } from "@/shared/components/ui/badges";

const JOURNEY_SNIPPET = `[
  {
    "key": "onboarding_start",
    "name": "Iniciar onboarding",
    "endpointId": "<ID de POST /customer-onboarding/start>",
    "payload": { "channel": "mobile_app" },
    "expectedStatusCodes": [200, 201],
    "extract": { "customerId": "data.customerId" }
  },
  {
    "key": "investigation_summary",
    "name": "Resumen de investigación",
    "endpointId": "<ID de GET …/investigation-summary>",
    "pathParams": { "customerId": "{{customerId}}" },
    "expectedStatusCodes": [200]
  }
]`;

export function GuideJourneyDiagram() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-0">
        <FlowNode
          method="GET"
          stepKey="health"
          name="Health check"
          route="/health"
          metas={[{ label: "espera 200" }]}
        />
        <Connector />
        <FlowNode
          method="POST"
          stepKey="onboarding_start"
          name="Iniciar onboarding"
          route="/customer-onboarding/start"
          metas={[
            { label: "espera 200 · 201" },
            { label: "extrae customerId ← data.customerId", extract: true },
          ]}
        />
        <Connector>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[0.6875rem] text-emerald-700">
            <Link2 className="h-3 w-3" />
            customerId = &quot;cus_8f2a…&quot; pasa al siguiente paso
          </span>
        </Connector>
        <FlowNode
          method="GET"
          stepKey="investigation_summary"
          name="Resumen de investigación"
          route={
            <>
              /operations/customers/
              <span className="rounded bg-atlas-accentSoft px-1 text-atlas-accent">
                {"{{customerId}}"}
              </span>
              /investigation-summary
            </>
          }
          metas={[{ label: "espera 200" }]}
        />
      </div>

      <CodeBlock code={JOURNEY_SNIPPET} label="journey · array de pasos" />
    </div>
  );
}

function FlowNode({
  method,
  stepKey,
  name,
  route,
  metas,
}: Readonly<{
  method: string;
  stepKey: string;
  name: string;
  route: React.ReactNode;
  metas: { label: string; extract?: boolean }[];
}>) {
  return (
    <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={method} />
        <span className="font-mono text-xs text-atlas-muted">{stepKey}</span>
        <span className="text-sm font-semibold text-atlas-text">{name}</span>
      </div>
      <p className="mt-2 break-all font-mono text-[0.8125rem] text-atlas-text">
        {route}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {metas.map((meta) => (
          <span
            key={meta.label}
            className={
              meta.extract
                ? "rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[0.6875rem] text-emerald-700"
                : "rounded-full bg-atlas-soft px-2 py-0.5 font-mono text-[0.6875rem] text-atlas-muted"
            }
          >
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Connector({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <div className="flex flex-col items-start gap-1 py-1 pl-6">
      <ArrowDown className="h-4 w-4 text-slate-300" />
      {children}
      {children ? <ArrowDown className="h-4 w-4 text-slate-300" /> : null}
    </div>
  );
}

function CodeBlock({ code, label }: Readonly<{ code: string; label: string }>) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-slate-400">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 font-mono text-[0.6875rem] text-slate-300 transition-colors hover:border-atlas-accent hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copiar
            </>
          )}
        </button>
      </div>
      <pre className="atlas-scrollbar overflow-x-auto p-4">
        <code className="font-mono text-[0.75rem] leading-6 text-slate-100">
          {code}
        </code>
      </pre>
    </div>
  );
}
