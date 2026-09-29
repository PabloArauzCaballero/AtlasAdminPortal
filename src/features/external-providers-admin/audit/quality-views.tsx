"use client";

import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { explainBlocker } from "../finding-codes";
import type { ProductionGate, QualityAudit, ReadinessReport } from "../types";
import { QualityFindingsTable } from "./findings-tables-quality";
import { GateProvidersTable, ReadinessProvidersTable } from "./provider-tables";
import { GateBanner, ReportShell } from "./report-shell";

export function QualityAuditView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<QualityAudit>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Auditoría de calidad"
      explanation="Revisa cómo está CONFIGURADO cada proveedor: si tiene conector, si pide consentimiento, si su costo está controlado y si su modo es coherente con su tipo. No llama a ningún proveedor."
    >
      {(data) => {
        const criticos = data.findings.filter(
          (f) => f.severity === "CRITICAL",
        ).length;
        const altos = data.findings.filter((f) => f.severity === "HIGH").length;
        const medios = data.findings.filter(
          (f) => f.severity === "MEDIUM",
        ).length;
        return (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Nota"
                value={`${data.rating} · ${formatNumber(data.score)}`}
                hint="100 menos lo que descuenta cada hallazgo"
                tone={
                  data.score >= 90
                    ? "success"
                    : data.score >= 70
                      ? "warning"
                      : "critical"
                }
              />
              <MetricCard
                label="Críticos"
                value={criticos}
                tone={criticos > 0 ? "critical" : "success"}
              />
              <MetricCard
                label="Altos"
                value={altos}
                tone={altos > 0 ? "warning" : "success"}
              />
              <MetricCard label="Medios" value={medios} tone="default" />
            </div>

            <GateBanner
              pass={data.qualityGates.canEnableProductionProviders}
              passText="No hay hallazgos críticos: se pueden habilitar proveedores en producción."
              failText="Hay hallazgos críticos sin resolver: no se puede habilitar ningún proveedor en producción."
            />

            <QualityFindingsTable findings={data.findings} />
            <p className="text-xs text-atlas-muted">
              Generado {formatDateTime(data.generatedAt)}
            </p>
          </>
        );
      }}
    </ReportShell>
  );
}

export function ProductionGateView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<ProductionGate>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Compuerta de producción"
      explanation="Responde a una sola pregunta: ¿se puede poner esto a hablar con los proveedores reales? Falla si hay hallazgos críticos, si algún proveedor no está listo o si la auditoría de datos tachados no pasa."
    >
      {(data) => (
        <>
          <GateBanner
            pass={data.canPromoteProduction}
            passText="Todo listo para producción con la configuración actual."
            failText="No se puede pasar a producción todavía."
          />

          {data.blockers.length > 0 ? (
            <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
              <h4 className="mb-2 text-sm font-semibold text-atlas-text">
                Qué lo impide
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-atlas-muted">
                {data.blockers.map((blocker) => (
                  <li key={blocker}>{explainBlocker(blocker)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <GateProvidersTable providers={data.providers} />

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-amber-900">
              Además, esto lo tiene que confirmar una persona
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
              {data.requiredManualChecks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </ReportShell>
  );
}

export function ReadinessView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<ReadinessReport>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Preparación por proveedor"
      explanation="El detalle proveedor a proveedor detrás de la compuerta: su modo, su última salud, cuántas políticas de costo tiene, cuántos fallos recientes acumula y qué le falta."
    >
      {(data) => <ReadinessProvidersTable items={data.readiness} />}
    </ReportShell>
  );
}
