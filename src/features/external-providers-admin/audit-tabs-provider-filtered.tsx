"use client";

import { useState } from "react";
import { Field, Input } from "@/shared/components/ui/input";
import { useProductionGate, useSlaReport, useUsageReport } from "./hooks";
import { ReportCheckbox, ReportFilters, ReportView } from "./report-view";

export function ProductionGateTab() {
  const [providerCode, setProviderCode] = useState("");
  const [strict, setStrict] = useState(true);
  const query = useProductionGate({
    providerCode: providerCode || undefined,
    strict,
  });

  return (
    <div className="space-y-4">
      <ReportFilters>
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="w-44 font-mono text-xs"
          />
        </Field>
        <ReportCheckbox
          label="Modo estricto"
          checked={strict}
          onChange={setStrict}
        />
      </ReportFilters>
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
      <ReportFilters>
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="w-44 font-mono text-xs"
          />
        </Field>
        <Field label="Ventana (días)">
          <Input
            type="number"
            min={1}
            max={366}
            className="w-32"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 30)}
          />
        </Field>
      </ReportFilters>
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
      <ReportFilters>
        <Field label="Código de proveedor (opcional)">
          <Input
            value={providerCode}
            onChange={(event) =>
              setProviderCode(event.target.value.toUpperCase())
            }
            placeholder="ej: SEGIP"
            className="w-44 font-mono text-xs"
          />
        </Field>
        <Field label="Ventana (días)">
          <Input
            type="number"
            min={1}
            max={366}
            className="w-32"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 30)}
          />
        </Field>
      </ReportFilters>
      <ReportView query={query} title="Uso y costo" />
    </div>
  );
}
