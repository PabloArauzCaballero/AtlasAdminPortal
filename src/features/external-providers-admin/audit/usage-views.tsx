"use client";

import {
  Ban,
  Coins,
  Database,
  PhoneCall,
  Play,
  TriangleAlert,
} from "lucide-react";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { SlaReport, UsageReport } from "../types";
import { EmptyGood, ReportShell, SimpleTable, Td, Tr } from "./report-shell";

/**
 * Barra de tasa de éxito.
 *
 * El número solo obliga a comparar mentalmente ocho porcentajes; la barra los ordena de un
 * vistazo. `null` es «no hubo llamadas», que no es 0 % y no se pinta como una barra vacía —eso
 * se leería como fracaso total.
 */
function SuccessBar({ rate }: Readonly<{ rate: number | null }>) {
  if (rate === null)
    return <span className="text-atlas-muted">Sin llamadas</span>;
  const tone =
    rate >= 95 ? "bg-emerald-500" : rate >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${Math.max(2, Math.min(100, rate))}%` }}
        />
      </div>
      <span className="tabular-nums">{formatNumber(rate)} %</span>
    </div>
  );
}

export function SlaReportView({
  query,
}: Readonly<{ query: Parameters<typeof ReportShell<SlaReport>>[0]["query"] }>) {
  return (
    <ReportShell
      query={query}
      title="Cumplimiento por proveedor"
      explanation="Cómo se portó cada proveedor en el período: cuántas llamadas atendió, cuántas falló, por qué motivo, cuánto tardó en el peor 5 % de los casos y cuánto costó."
    >
      {(data) =>
        data.providers.length === 0 ? (
          <EmptyGood>No se llamó a ningún proveedor en este período.</EmptyGood>
        ) : (
          <>
            <SimpleTable
              headers={[
                "Proveedor",
                "Llamadas",
                "Éxito",
                "Fallos",
                "Bloqueadas",
                "Límite",
                "Credencial",
                "p95",
                "Costo",
              ]}
              align={{
                1: "right",
                3: "right",
                4: "right",
                5: "right",
                6: "right",
                7: "right",
                8: "right",
              }}
            >
              {data.providers.map((provider) => (
                <Tr key={provider.providerCode}>
                  <Td>
                    <p className="font-medium text-atlas-text">
                      {provider.providerCode}
                    </p>
                    {provider.warnings.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {provider.warnings.map((warning) => (
                          <Badge
                            key={warning}
                            tone="warning"
                            icon={TriangleAlert}
                          >
                            {warning}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </Td>
                  <Td right>{formatNumber(provider.total)}</Td>
                  <Td>
                    <SuccessBar rate={provider.successRate} />
                  </Td>
                  <Td right>{formatNumber(provider.failed)}</Td>
                  <Td right>{formatNumber(provider.blocked)}</Td>
                  <Td right>{formatNumber(provider.rateLimited)}</Td>
                  <Td right>{formatNumber(provider.authFailed)}</Td>
                  <Td right>
                    {provider.p95LatencyMs === null
                      ? "—"
                      : `${formatNumber(provider.p95LatencyMs)} ms`}
                  </Td>
                  <Td right>{formatNumber(provider.actualCost)}</Td>
                </Tr>
              ))}
            </SimpleTable>
            <p className="text-xs text-atlas-muted">
              Últimos {data.days} días · generado{" "}
              {formatDateTime(data.generatedAt)} · «Límite» son las llamadas que
              el proveedor rechazó por exceso de consultas; «Credencial», las
              que rechazó por autenticación.
            </p>
          </>
        )
      }
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
