"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import {
  ENGINE_ACTION_LABELS,
  ENGINE_DECISION_LABELS,
  ENGINE_INPUT_LABELS,
  ENGINE_REASON_LABELS,
  engineInputValue,
  engineLabel,
} from "./engine-labels";
import type { PrivacyEngineOpinion } from "./types";

const TONO: Record<string, "success" | "critical" | "warning"> = {
  ACEPTAR: "success",
  RECHAZAR: "critical",
  REVISION_HUMANA: "warning",
};

/** La opinión del Motor como etiqueta corta, para la lista. Sin opinión, nada. */
export function EngineDecisionBadge({
  engine,
}: Readonly<{ engine: PrivacyEngineOpinion | null | undefined }>) {
  if (!engine?.decision) return null;
  return (
    <Badge tone={TONO[engine.decision] ?? "default"}>
      {engineLabel(ENGINE_DECISION_LABELS, engine.decision)}
    </Badge>
  );
}

/**
 * Lo que opinó el Motor y con qué hechos.
 *
 * En SOMBRA la opinión no cambia nada: la solicitud sigue esperando a una persona, que la cierra con su motivo. Se
 * enseña para que decida con la misma información y para medir, solicitud a solicitud, si el Motor y la persona
 * coinciden antes de darle autoridad.
 */
export function PrivacyRequestEngine({
  engine,
}: Readonly<{ engine: PrivacyEngineOpinion | null | undefined }>) {
  if (!engine) return null;

  if (!engine.decision) {
    return (
      <div
        className="rounded-lg bg-atlas-surface-muted p-3 text-sm"
        data-testid="opinion-del-motor"
      >
        <p className="font-medium">El Motor no pudo opinar</p>
        <p className="text-atlas-muted">
          {`Lo intentó ${engine.attempts} ${engine.attempts === 1 ? "vez" : "veces"}: ${engine.lastError ?? "sin detalle"}. Decide igual; no hace falta esperarlo.`}
        </p>
      </div>
    );
  }

  const hechos = engine.inputs ?? {};
  return (
    <div className="space-y-3" data-testid="opinion-del-motor">
      <KeyValueSection
        title="Lo que opinó el Motor"
        description={
          engine.mode === "shadow"
            ? "Modo sombra: es una opinión, no una decisión. La solicitud la cierras tú, con tu motivo."
            : "Decisión del Motor."
        }
        items={[
          {
            label: "Recomienda",
            value: <EngineDecisionBadge engine={engine} />,
          },
          {
            label: "Por qué",
            value: engineLabel(ENGINE_REASON_LABELS, engine.reasonCode),
          },
          {
            label: "Qué habría que hacer",
            value: engineLabel(ENGINE_ACTION_LABELS, engine.action),
          },
          {
            label: "Señales de riesgo",
            value: engine.riskSignals ?? "—",
          },
          ...(engine.reevaluateCredit
            ? [
                {
                  label: "Línea de crédito",
                  value: "Si se aplica, hay que recalcular su línea.",
                },
              ]
            : []),
          {
            label: "Cuándo y con qué versión",
            value: `${formatDateTime(engine.decidedAt)} · ${engine.artifactCode ?? "—"} v${engine.artifactVersionId ?? "?"}`,
          },
        ]}
      />
      <KeyValueSection
        title="Los hechos que vio"
        description="Lo que el Motor recibió de la cuenta en ese momento. Ningún dato personal sale de Atlas."
        items={ENGINE_INPUT_LABELS.filter(([codigo]) => codigo in hechos).map(
          ([codigo, label]) => ({
            label,
            value: engineInputValue(hechos[codigo]),
          }),
        )}
      />
    </div>
  );
}
