"use client";

import { Badge } from "@/shared/components/ui/badges";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { explainBlocker, explainFinding, SEVERIDADES } from "../finding-codes";
import {
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "../provider-badges";
import type {
  ProductionGate,
  QualityAudit,
  ReadinessReport,
  Severity,
} from "../types";
import {
  EmptyGood,
  GateBanner,
  ReportShell,
  SimpleTable,
  Td,
  Tr,
} from "./report-shell";

const ORDEN: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/** Los hallazgos llegan en el orden en que se descubrieron; se leen por gravedad. */
function porGravedad<T extends { severity: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      ORDEN.indexOf(a.severity as Severity) -
      ORDEN.indexOf(b.severity as Severity),
  );
}

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

            {data.findings.length === 0 ? (
              <EmptyGood>
                Ningún proveedor tiene problemas de configuración.
              </EmptyGood>
            ) : (
              <SimpleTable
                headers={["Gravedad", "Proveedor", "Qué pasa", "Qué hacer"]}
              >
                {porGravedad(data.findings).map((finding, index) => {
                  const explicacion = explainFinding(finding.code);
                  const severidad = SEVERIDADES[finding.severity] ?? {
                    label: finding.severity,
                    tone: "default" as const,
                  };
                  return (
                    <Tr
                      key={`${finding.code}-${finding.providerCode ?? "global"}-${index}`}
                    >
                      <Td>
                        <Badge tone={severidad.tone}>{severidad.label}</Badge>
                      </Td>
                      <Td>{finding.providerCode ?? "General"}</Td>
                      <Td>
                        <p className="font-medium text-atlas-text">
                          {explicacion.label}
                        </p>
                        <p className="text-atlas-muted">
                          {explicacion.summary}
                        </p>
                        {/* El mensaje del backend nombra la consulta o el bloqueo concreto. */}
                        <p className="mt-1 text-xs text-atlas-muted">
                          {finding.message}
                        </p>
                      </Td>
                      <Td muted>{explicacion.action ?? "—"}</Td>
                    </Tr>
                  );
                })}
              </SimpleTable>
            )}
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

          <SimpleTable
            headers={[
              "Proveedor",
              "Cómo se le llama",
              "Salud",
              "Sirve simulado",
              "Sirve producción",
              "Bloqueos",
            ]}
          >
            {data.providers.map((provider) => (
              <Tr key={provider.providerCode}>
                <Td>{provider.providerCode}</Td>
                <Td>
                  <ProviderModeBadge value={provider.mode} />
                </Td>
                <Td>
                  <ProviderHealthBadge value={provider.healthStatus} />
                </Td>
                <Td>{provider.readyForMock ? "Sí" : "No"}</Td>
                <Td>{provider.readyForProduction ? "Sí" : "No"}</Td>
                <Td muted>
                  {provider.blockers.length === 0
                    ? "—"
                    : provider.blockers
                        .map((blocker) => explainBlocker(blocker))
                        .join(" ")}
                </Td>
              </Tr>
            ))}
          </SimpleTable>

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
      {(data) => (
        <SimpleTable
          headers={[
            "Proveedor",
            "Tipo",
            "Cómo se le llama",
            "Salud",
            "Políticas",
            "Fallos recientes",
            "Qué le falta",
          ]}
          align={{ 4: "right", 5: "right" }}
        >
          {data.readiness.map((item) => (
            <Tr key={item.providerCode}>
              <Td>
                <p className="font-medium text-atlas-text">
                  {item.providerCode}
                </p>
                <p className="text-xs text-atlas-muted">{item.name ?? "—"}</p>
              </Td>
              <Td>
                <ProviderStatusBadge value={item.status} />
              </Td>
              <Td>
                <ProviderModeBadge value={item.mode} />
              </Td>
              <Td>
                <ProviderHealthBadge value={item.health?.status} />
              </Td>
              <Td right>{item.policies?.length ?? 0}</Td>
              <Td right>{formatNumber(item.recentFailures)}</Td>
              <Td muted>
                {item.blockers.length === 0
                  ? "Nada"
                  : item.blockers.map((b) => explainBlocker(b)).join(" ")}
              </Td>
            </Tr>
          ))}
        </SimpleTable>
      )}
    </ReportShell>
  );
}
