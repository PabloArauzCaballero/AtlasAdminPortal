"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { engineExecutionUrl } from "@/shared/decision-engine/engine-links";

/**
 * Quién decidió esta evaluación.
 *
 * ## Por qué esto va ANTES de la explicación
 *
 * AtlasBackend resuelve el riesgo por una cadena de tres escalones —Motor de Decisión, ruleset local
 * versionado, heurística v0— y lo que se pinta más abajo (reglas disparadas, contribuciones de
 * features) sale SIEMPRE del cálculo local. Cuando decidió el Motor, ese desglose describe un
 * cálculo que no tomó la decisión: enseñarlo sin decirlo convierte contexto en explicación, y un
 * analista que defiende un rechazo meses después estaría citando el motivo equivocado.
 *
 * Con la procedencia delante, la pantalla deja de duplicar al Motor y pasa a apuntar a él: la
 * explicación de verdad está en su ejecución, y aquí queda el enlace.
 */
const ETIQUETA: Record<
  string,
  { titulo: string; tono: "success" | "warning" | "muted"; detalle: string }
> = {
  decision_engine: {
    titulo: "Lo decidió el Motor de Decisión",
    tono: "success",
    detalle:
      "Política versionada, aprobada y con auditoría encadenada. La explicación que vale es la de su ejecución; lo que sigue en esta pantalla es el contexto que Atlas calculó, no el motivo de la decisión.",
  },
  ruleset: {
    titulo: "Lo decidió la política local de Atlas",
    tono: "warning",
    detalle:
      "El Motor no resolvió esta evaluación y se aplicó el ruleset versionado de Atlas. Es una degradación prevista: no bloquea altas cuando el Motor no responde, pero esta población no es comparable con la que resolvió el Motor.",
  },
  heuristic_v0: {
    titulo: "Lo decidió la heurística de arranque",
    tono: "warning",
    detalle:
      "Último recurso: no había ni Motor ni ruleset activo. Los factores de abajo son literalmente el cálculo que decidió, y por eso aquí sí explican la decisión.",
  },
};

export function ProcedenciaDeLaDecision({
  decisionSource,
  decisionExecutionId,
}: Readonly<{
  decisionSource: string | null;
  decisionExecutionId: string | null;
}>) {
  const etiqueta = decisionSource ? ETIQUETA[decisionSource] : undefined;
  const enlace = engineExecutionUrl(decisionExecutionId);

  return (
    <Card className="mb-6">
      <CardHeader>
        <h3 className="text-sm font-semibold text-atlas-text">
          Quién tomó esta decisión
        </h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {etiqueta ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={etiqueta.tono}>{etiqueta.titulo}</Badge>
              {decisionExecutionId ? (
                <code className="select-all font-mono text-xs text-atlas-muted">
                  {decisionExecutionId}
                </code>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-atlas-text">
              {etiqueta.detalle}
            </p>
          </>
        ) : (
          /*
           * `null` no es «lo decidió el heurístico»: es una evaluación anterior a que se registrara
           * la procedencia. Rellenarla con el escalón más probable sería inventar una respuesta a
           * una pregunta que nadie hizo cuando ocurrió.
           */
          <p className="text-sm leading-6 text-atlas-muted">
            No consta quién decidió: esta evaluación es anterior a que se
            registrara la procedencia. No se puede afirmar por eso que la
            resolviera la política local.
          </p>
        )}
        {enlace ? (
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-3 py-1.5 text-sm text-atlas-text hover:bg-atlas-soft"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Ver la ejecución en el Motor
          </a>
        ) : null}
        {decisionExecutionId && !enlace ? (
          <p className="text-xs text-atlas-muted">
            Para saltar a la ejecución hace falta configurar
            <span className="font-mono"> NEXT_PUBLIC_DECISION_ENGINE_URL</span>.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** `true` cuando el desglose local NO explica la decisión, sólo la acompaña. */
export function decidioElMotor(decisionSource: string | null): boolean {
  return decisionSource === "decision_engine";
}
