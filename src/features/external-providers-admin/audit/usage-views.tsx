"use client";

import { Ban, Coins, Database, PhoneCall, Play } from "lucide-react";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { SlaReport, UsageReport } from "../types";
import { SlaProvidersTable } from "./provider-tables";
import { ReportShell } from "./report-shell";

export function SlaReportView({
  query,
}: Readonly<{ query: Parameters<typeof ReportShell<SlaReport>>[0]["query"] }>) {
  return (
    <ReportShell
      query={query}
      title="Cumplimiento por proveedor"
      explanation="Cómo se portó cada proveedor en el período: cuántas llamadas atendió, cuántas falló, por qué motivo, cuánto tardó en el peor 5 % de los casos y cuánto costó."
    >
      {(data) => (
        <>
          <SlaProvidersTable providers={data.providers} />
          <p className="text-xs text-atlas-muted">
            Últimos {data.days} días · generado{" "}
            {formatDateTime(data.generatedAt)} · «Límite» son las llamadas que
            el proveedor rechazó por exceso de consultas; «Credencial», las que
            rechazó por autenticación.
          </p>
        </>
      )}
    </ReportShell>
  );
}

export function UsageReportView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<UsageReport>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Consumo y costo"
      explanation="Cuántas consultas se pidieron, cuántas llegaron a ejecutarse, cuántas se frenaron por política y cuánto costó todo. Sirve para conciliar la factura del proveedor."
    >
      {(data) => (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Pedidas"
              value={data.summary.total}
              icon={PhoneCall}
            />
            <MetricCard
              label="Ejecutadas"
              value={data.summary.executed}
              icon={Play}
              tone="success"
            />
            <MetricCard
              label="Frenadas"
              value={data.summary.blocked}
              hint="Por costo, consentimiento o aprobación"
              icon={Ban}
              tone={data.summary.blocked > 0 ? "warning" : "default"}
            />
            <MetricCard
              label="Desde caché"
              value={data.summary.cached}
              hint="Reutilizadas, sin volver a llamar"
              icon={Database}
            />
            <MetricCard
              label="Costo estimado"
              value={formatNumber(data.summary.estimatedCost)}
              icon={Coins}
            />
            <MetricCard
              label="Costo real"
              value={formatNumber(data.summary.actualCost)}
              icon={Coins}
            />
          </div>
          <p className="text-xs text-atlas-muted">
            {data.providerCode === "ALL"
              ? "Todos los proveedores"
              : data.providerCode}{" "}
            · últimos {data.days} días · generado{" "}
            {formatDateTime(data.generatedAt)}
          </p>
        </>
      )}
    </ReportShell>
  );
}
