"use client";

import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatNumber } from "@/shared/lib/format";
import type {
  IdempotencyAudit,
  RetentionPreview,
  SanitizationAudit,
} from "../types";
import {
  IdempotencyFindingsTable,
  RetentionCandidatesTable,
  SanitizationFindingsTable,
} from "./findings-tables";
import { GateBanner, ReportShell } from "./report-shell";

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

          <IdempotencyFindingsTable findings={data.findings} />

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
            <RetentionCandidatesTable candidates={candidatos} />
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

          <SanitizationFindingsTable findings={data.findings} />
        </>
      )}
    </ReportShell>
  );
}
