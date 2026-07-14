"use client";

import { useState } from "react";
import { Field, Input } from "@/shared/components/ui/input";
import { useProductionGate, useSlaReport, useUsageReport } from "./hooks";
import { ReportView } from "./report-view";

export function ProductionGateTab() {
  const [providerCode, setProviderCode] = useState("");
  const [strict, setStrict] = useState(true);
  const query = useProductionGate({
    providerCode: providerCode || undefined,
    strict,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="font-mono text-xs"
          />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-atlas-text">
          <input
            type="checkbox"
            checked={strict}
            onChange={(event) => setStrict(event.target.checked)}
          />
          Modo estricto
        </label>
      </div>
      <ReportView query={query} title="Production gate" />
    </div>
  );
}

export function SlaReportTab() {
  const [providerCode, setProviderCode] = useState("");
  const [days, setDays] = useState(30);
  const query = useSlaReport({ providerCode: providerCode || undefined, days });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Ventana (días)">
          <Input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 30)}
          />
        </Field>
      </div>
      <ReportView query={query} title="Reporte de SLA" />
    </div>
  );
}

export function UsageReportTab() {
  const [providerCode, setProviderCode] = useState("");
  const [days, setDays] = useState(30);
  const query = useUsageReport({
    providerCode: providerCode || undefined,
    days,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Ventana (días)">
          <Input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 30)}
          />
        </Field>
      </div>
      <ReportView query={query} title="Uso y costo" />
    </div>
  );
}
