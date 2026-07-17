"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { EmptyState } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { buildFeatureContributionColumns } from "./feature-contributions-columns";
import { buildRulesFiredColumns } from "./rules-fired-columns";
import type { RiskAssessmentDetail } from "./types";

const TABS = [
  "Corrida",
  "Resultado",
  "Reglas",
  "Contribuciones",
  "Snapshot",
] as const;

function RunTab({ detail }: Readonly<{ detail: RiskAssessmentDetail }>) {
  const { run } = detail;
  return (
    <div className="space-y-3">
      {/* La sesión es el único ID de la corrida con su propia vista de
          investigación; el enlace va fuera del grid porque KeyValueGrid
          renderiza los valores como texto plano. */}
      {run.sessionId ? (
        <Link
          href={`/internal/operations/sessions/${run.sessionId}/investigation-summary`}
          className="inline-flex text-sm font-semibold text-atlas-accent hover:underline"
        >
          Ver la investigación de la sesión #{run.sessionId} →
        </Link>
      ) : null}
      <KeyValueGrid
        items={[
          { label: "ID de corrida", value: run.id, mono: true },
          { label: "Estado", value: run.runStatus },
          { label: "Tipo de evaluación", value: run.assessmentType },
          { label: "Origen del disparo", value: run.triggerSource },
          { label: "Tipo de sujeto", value: run.subjectType },
          { label: "ID de sujeto", value: run.subjectId, mono: true },
          { label: "Cliente", value: run.customerId, mono: true },
          { label: "Sesión", value: run.sessionId, mono: true },
          {
            label: "Flujo de onboarding",
            value: run.onboardingFlowId,
            mono: true,
          },
          { label: "Dispositivo", value: run.deviceId, mono: true },
          {
            label: "Versión de modelo",
            value: run.riskModelVersionId,
            mono: true,
          },
          {
            label: "Versión de ruleset",
            value: run.riskRulesetVersionId,
            mono: true,
          },
          {
            label: "Snapshot de features",
            value: run.featureSnapshotId,
            mono: true,
          },
          {
            label: "Clave de idempotencia",
            value: run.idempotencyKey,
            mono: true,
          },
          { label: "Iniciada", value: formatDateTime(run.startedAt) },
          { label: "Completada", value: formatDateTime(run.completedAt) },
          { label: "Latencia (ms)", value: formatNumber(run.latencyMs) },
          { label: "Registrada", value: formatDateTime(run.createdAtValue) },
        ]}
      />
    </div>
  );
}

function ResultTab({ detail }: Readonly<{ detail: RiskAssessmentDetail }>) {
  const { result } = detail;
  if (!result) {
    return (
      <EmptyState
        title="La corrida no registró un resultado."
        description="No hay decisión, nivel de riesgo ni scores para mostrar. La evaluación puede seguir en curso o haber fallado antes de decidir."
      />
    );
  }
  return (
    <div className="space-y-4">
      <KeyValueGrid
        items={[
          { label: "ID de resultado", value: result.id, mono: true },
          { label: "Acción recomendada", value: result.recommendedAction },
          { label: "Nivel de riesgo", value: result.riskLevel },
          { label: "Score total", value: formatNumber(result.scoreTotal) },
          { label: "Score de fraude", value: formatNumber(result.fraudScore) },
          {
            label: "Score de identidad",
            value: formatNumber(result.identityScore),
          },
          {
            label: "Score de dispositivo",
            value: formatNumber(result.deviceRiskScore),
          },
          {
            label: "Score de comportamiento",
            value: formatNumber(result.behaviorScore),
          },
          {
            label: "Score de contactabilidad",
            value: formatNumber(result.contactabilityScore),
          },
          {
            label: "Score de consistencia",
            value: formatNumber(result.consistencyScore),
          },
          {
            label: "Modelo (snapshot)",
            value: result.modelVersionCodeSnapshot,
            mono: true,
          },
          {
            label: "Ruleset (snapshot)",
            value: result.rulesetVersionCodeSnapshot,
            mono: true,
          },
          {
            label: "Hash de integridad",
            value: result.integrityHash,
            mono: true,
          },
          { label: "Decidido", value: formatDateTime(result.decidedAt) },
          { label: "Registrado", value: formatDateTime(result.createdAtValue) },
        ]}
      />
      <JsonViewer value={result.reasonCodesJson} title="reason_codes_json" />
    </div>
  );
}

function SnapshotTab({ detail }: Readonly<{ detail: RiskAssessmentDetail }>) {
  const snapshot = detail.featureSnapshot;
  if (!snapshot) {
    return (
      <EmptyState
        title="Sin snapshot de features."
        description="Esta corrida no dejó registrado el estado de las features usadas para evaluar."
      />
    );
  }
  return (
    <div className="space-y-4">
      <KeyValueGrid
        items={[
          { label: "ID de snapshot", value: snapshot.id, mono: true },
          { label: "Motivo", value: snapshot.snapshotReason },
          {
            label: "Versión del feature set",
            value: snapshot.featureSetVersion,
          },
          {
            label: "Hash de integridad",
            value: snapshot.integrityHash,
            mono: true,
          },
          {
            label: "Registrado",
            value: formatDateTime(snapshot.createdAtValue),
          },
        ]}
      />
      {/* La forma de features_json no está garantizada por contrato: se muestra crudo. */}
      <JsonViewer value={snapshot.featuresJson} title="features_json" />
      <JsonViewer
        value={snapshot.missingFeaturesJson}
        title="missing_features_json"
      />
      <JsonViewer
        value={snapshot.catalogVersionsJson}
        title="catalog_versions_json"
      />
    </div>
  );
}

export function AuditTrailTabs({
  detail,
}: Readonly<{ detail: RiskAssessmentDetail }>) {
  const [active, setActive] = useState<string>(TABS[0]);
  return (
    <section>
      <DetailTabs tabs={[...TABS]} active={active} onChange={setActive} />
      {active === "Corrida" ? <RunTab detail={detail} /> : null}
      {active === "Resultado" ? <ResultTab detail={detail} /> : null}
      {active === "Reglas" ? (
        <DataTable
          data={detail.rulesFired}
          columns={buildRulesFiredColumns()}
          emptyTitle="La evaluación no disparó reglas."
          emptyDescription="Ninguna regla del ruleset se activó para esta corrida."
        />
      ) : null}
      {active === "Contribuciones" ? (
        <DataTable
          data={detail.featureContributions}
          columns={buildFeatureContributionColumns()}
          emptyTitle="Sin contribuciones de features."
          emptyDescription="La corrida no registró el aporte de cada feature al score."
        />
      ) : null}
      {active === "Snapshot" ? <SnapshotTab detail={detail} /> : null}
    </section>
  );
}
