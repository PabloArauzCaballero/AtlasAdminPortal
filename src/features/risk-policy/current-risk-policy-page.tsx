"use client";
import { useMemo, useState } from "react";
import { useCurrentRiskPolicy } from "@/features/operations/hooks";
import { AvisoDeAutoriaEnElMotor } from "./policy-authoring-notice";
import {
  RISK_DIMENSION_OPTIONS,
  RISK_SEVERITY_OPTIONS,
  riskPolicyLabel,
} from "./risk-policy-labels";
import { RULESET_COLUMNS, RULE_COLUMNS, type RuleRow } from "./policy-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { SectionTable } from "@/shared/components/data-table/section-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { Scale } from "lucide-react";
export function CurrentRiskPolicyPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    // El mismo permiso que el ítem del menú (`operations.riskPolicy.read`). Pedía `lineage.read`:
    // un analista de riesgo veía «Política riesgo» en el menú y al entrar le salía «Acceso
    // restringido», porque ningún rol de riesgo tiene permisos de linaje.
    <PermissionGate permissions={["operations.riskPolicy.read"]}>
      <AuthorizedCurrentRiskPolicyPage />
    </PermissionGate>
  );
}

function AuthorizedCurrentRiskPolicyPage() {
  const policy = useCurrentRiskPolicy();
  const rules = useMemo<RuleRow[]>(
    () =>
      (policy.data?.rulesetVersions ?? []).flatMap((ruleset) =>
        ruleset.rules.map((rule) => ({
          ...rule,
          ruleset: `${ruleset.rulesetCode}@${ruleset.versionCode}`,
          rulesetStatus: ruleset.status,
        })),
      ),
    [policy.data?.rulesetVersions],
  );
  const [q, setQ] = useState("");
  const [dimension, setDimension] = useState("");
  const [severity, setSeverity] = useState("");
  const [hardStop, setHardStop] = useState("");
  const visibles = useMemo(() => {
    const buscado = normalizar(q.trim());
    return rules.filter(
      (rule) =>
        (!dimension || rule.riskDimension === dimension) &&
        (!severity || rule.severity === severity) &&
        (!hardStop || String(rule.isHardStop) === hardStop) &&
        (!buscado ||
          normalizar(
            `${rule.ruleset} ${rule.ruleName} ${rule.ruleCode}`,
          ).includes(buscado)),
    );
  }, [rules, q, dimension, severity, hardStop]);
  return (
    <>
      <PageHeader
        icon={Scale}
        eyebrow="Política de riesgo"
        title="Política de riesgo actual"
        description="Qué política LOCAL está vigente. Es la red de seguridad para cuando el Motor no responde, no la política que decide en condiciones normales."
      />

      <AvisoDeAutoriaEnElMotor />
      {policy.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {policy.error ? (
        <ErrorState
          description={
            isAtlasApiError(policy.error)
              ? policy.error.message
              : "No se pudo cargar política de riesgo."
          }
          requestId={
            isAtlasApiError(policy.error) ? policy.error.requestId : undefined
          }
          onRetry={() => void policy.refetch()}
        />
      ) : null}
      {policy.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Modelos"
              value={formatNumber(policy.data.modelVersions.length)}
            />
            <MetricCard
              label="Rulesets"
              value={formatNumber(policy.data.rulesetVersions.length)}
            />
            <MetricCard label="Reglas" value={formatNumber(rules.length)} />
            <MetricCard
              label="Señales"
              value={formatNumber(policy.data.riskSignalSeeds.length)}
            />
          </section>
          <SectionTable
            title="Versiones"
            description="Estado efectivo de modelos y rulesets."
            data={policy.data.rulesetVersions}
            columns={RULESET_COLUMNS}
            searchText={(r) =>
              `${r.rulesetCode}@${r.versionCode} ${riskPolicyLabel.assessmentType(r.assessmentType)} ${r.status}`
            }
            searchPlaceholder="Buscar versión de ruleset…"
            searchTooltip="Recorre todas las versiones de ruleset vigentes, que llegan enteras del servidor: coincide con parte del código, la versión, el tipo o el estado."
            emptyTitle="No hay versiones de ruleset vigentes."
            emptyDescription="Cuando se publique un ruleset de riesgo aparecerá aquí."
          />
          <section className="space-y-3">
            <SectionHeader
              title="Reglas de política"
              description="Reglas asociadas a los rulesets actuales."
              className="mb-0"
            />
            <FilterBar
              search={q}
              searchPlaceholder="Buscar por regla, código o ruleset…"
              searchTooltip="Recorre todas las reglas de la política vigente, que llegan enteras del servidor (es un catálogo cerrado de unas decenas): coincide con parte del nombre, del código o del ruleset."
              filters={[
                {
                  name: "dimension",
                  label: "Dimensión",
                  tooltip:
                    "Qué mira la regla: capacidad de pago, endeudamiento, identidad, fraude…",
                  value: dimension,
                  options: RISK_DIMENSION_OPTIONS,
                },
                {
                  name: "severity",
                  label: "Severidad",
                  tooltip: "Qué tan grave es lo que la regla detecta.",
                  value: severity,
                  options: RISK_SEVERITY_OPTIONS,
                },
                {
                  name: "hardStop",
                  label: "Hard stop",
                  tooltip:
                    "«Sí» son las reglas que frenan la solicitud sin más análisis.",
                  value: hardStop,
                  options: [
                    {
                      value: "true",
                      label: "Sí",
                      description: "Frenan la solicitud sin más análisis.",
                    },
                    {
                      value: "false",
                      label: "No",
                      description: "Suman a la evaluación pero no la frenan.",
                    },
                  ],
                },
              ]}
              onSearchChange={setQ}
              onFilterChange={(name, value) => {
                if (name === "dimension") setDimension(value);
                if (name === "severity") setSeverity(value);
                if (name === "hardStop") setHardStop(value);
              }}
              onClear={() => {
                setQ("");
                setDimension("");
                setSeverity("");
                setHardStop("");
              }}
            />
            <DataTable
              data={visibles}
              columns={RULE_COLUMNS}
              emptyTitle={
                rules.length === 0
                  ? "No hay reglas de riesgo visibles."
                  : "Ninguna regla coincide con los filtros."
              }
              emptyDescription={
                rules.length === 0
                  ? "La política vigente no trae reglas."
                  : "Cambia o quita alguno de los filtros."
              }
            />
          </section>
        </div>
      ) : null}
    </>
  );
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
