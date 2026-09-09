"use client";

import { Badge } from "@/shared/components/ui/badges";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { explainFinding, explainStatus, SEVERIDADES } from "../finding-codes";
import type {
  IdempotencyAudit,
  RetentionPreview,
  SanitizationAudit,
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

function severidad(value: string) {
  return (
    SEVERIDADES[value as Severity] ?? { label: value, tone: "default" as const }
  );
}

export function IdempotencyAuditView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<IdempotencyAudit>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Consultas repetidas"
      explanation="Comprueba que la misma llave de «no repetir» no se haya usado para consultas distintas. Si eso pasa, un cliente puede recibir la respuesta que se pidió para otro. Falla si hay algún caso de ese tipo."
    >
      {(data) => (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Solicitudes revisadas"
              value={data.inspectedRequests}
            />
            <MetricCard
              label="Repeticiones encontradas"
              value={data.findings.length}
              tone={data.findings.length > 0 ? "warning" : "success"}
            />
            <MetricCard
              label="Puntuación"
              value={formatNumber(data.score)}
              tone={data.qualityGate === "PASS" ? "success" : "critical"}
            />
          </div>

          <GateBanner
            pass={data.qualityGate === "PASS"}
            passText="Ninguna llave se reutilizó para una consulta distinta."
            failText="Hay llaves reutilizadas con contenido distinto: revisar quién las genera."
          />

          {data.findings.length === 0 ? (
            <EmptyGood>
              No se encontró ninguna repetición en la ventana revisada.
            </EmptyGood>
          ) : (
            <SimpleTable
              headers={["Gravedad", "Qué pasó", "Veces", "Solicitudes"]}
              align={{ 2: "right" }}
            >
              {data.findings.map((finding) => {
                const explicacion = explainFinding(finding.code);
                const tono = severidad(finding.severity);
                return (
                  <Tr key={finding.keyHash}>
                    <Td>
                      <Badge tone={tono.tone}>{tono.label}</Badge>
                    </Td>
                    <Td>
                      <p className="font-medium text-atlas-text">
                        {explicacion.label}
                      </p>
                      <p className="text-atlas-muted">{explicacion.summary}</p>
                    </Td>
                    <Td right>{finding.occurrences}</Td>
                    <Td muted>{finding.requestIds.join(", ")}</Td>
                  </Tr>
                );
              })}
            </SimpleTable>
          )}

          <div className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
            <h4 className="mb-2 text-sm font-semibold text-atlas-text">
              Qué lo impide de entrada
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-atlas-muted">
              {data.controls.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </ReportShell>
  );
}

export function RetentionPreviewView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<RetentionPreview>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Qué se borraría por antigüedad"
      explanation="Lista las consultas lo bastante antiguas como para purgarse según la política de retención. Es una VISTA PREVIA: no borra nada."
    >
      {(data) => {
        const candidatos = data.candidates ?? [];
        return (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard
                label="Candidatas a purga"
                value={data.candidateCount ?? candidatos.length}
              />
              <MetricCard
                label="Más antiguas que"
                value={`${data.olderThanDays ?? "—"} días`}
              />
            </div>
            {data.note ? (
              <p className="text-sm text-atlas-muted">{data.note}</p>
            ) : null}
            {candidatos.length === 0 ? (
              <EmptyGood>
                No hay ninguna consulta lo bastante antigua para purgarse.
              </EmptyGood>
            ) : (
              <SimpleTable
                headers={[
                  "Solicitud",
                  "Cliente",
                  "Cuándo se pidió",
                  "Cómo acabó",
                  "Qué se haría",
                ]}
              >
                {candidatos.map((candidato) => (
                  <Tr key={candidato.requestId}>
                    <Td>{candidato.requestId}</Td>
                    <Td muted>{candidato.customerId ?? "—"}</Td>
                    <Td muted>{formatDateTime(candidato.requestedAt)}</Td>
                    <Td>
                      {candidato.responseStatus ? (
                        <Badge
                          tone={
                            explainStatus(candidato.responseStatus).tone ??
                            "default"
                          }
                        >
                          {explainStatus(candidato.responseStatus).label}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td muted>{candidato.action ?? "—"}</Td>
                  </Tr>
                ))}
              </SimpleTable>
            )}
          </>
        );
      }}
    </ReportShell>
  );
}

export function SanitizationAuditView({
  query,
}: Readonly<{
  query: Parameters<typeof ReportShell<SanitizationAudit>>[0]["query"];
}>) {
  return (
    <ReportShell
      query={query}
      title="Datos sensibles sin tachar"
      explanation="Busca, en las respuestas ya guardadas, claves que suelen contener secretos o datos personales. Falla si encuentra alguna: significa que se está almacenando algo que debería ir tachado."
    >
      {(data) => (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Respuestas revisadas"
              value={data.inspectedResponses}
            />
            <MetricCard
              label="Hallazgos"
              value={data.findings.length}
              tone={data.findings.length > 0 ? "critical" : "success"}
            />
            <MetricCard
              label="Puntuación"
              value={formatNumber(data.score)}
              tone={data.qualityGate === "PASS" ? "success" : "critical"}
            />
          </div>

          <GateBanner
            pass={data.qualityGate === "PASS"}
            passText="Ninguna respuesta guardada contiene claves sensibles sin tachar."
            failText="Hay respuestas guardadas con claves sensibles sin tachar."
          />

          {data.findings.length === 0 ? (
            <EmptyGood>La muestra revisada está limpia.</EmptyGood>
          ) : (
            <SimpleTable
              headers={[
                "Gravedad",
                "Clave encontrada",
                "Respuesta",
                "Solicitud",
              ]}
            >
              {data.findings.map((finding) => {
                const tono = severidad(finding.severity);
                return (
                  <Tr key={finding.responseId}>
                    <Td>
                      <Badge tone={tono.tone}>{tono.label}</Badge>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">{finding.key}</span>
                      <p className="text-atlas-muted">
                        {explainFinding(finding.code).summary}
                      </p>
                    </Td>
                    <Td muted>{finding.responseId}</Td>
                    <Td muted>{finding.providerRequestId}</Td>
                  </Tr>
                );
              })}
            </SimpleTable>
          )}
        </>
      )}
    </ReportShell>
  );
}
