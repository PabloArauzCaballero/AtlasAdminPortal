"use client";

import Link from "next/link";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useDecisionArtifacts } from "./hooks";
import type { BindingSource } from "./types";

/**
 * El catálogo de decisiones delegadas al motor.
 *
 * ## Por qué es una tabla y no tres tarjetas con formulario
 *
 * Porque la primera pregunta de quien abre esta pantalla no es «quiero cambiar algo», es «qué decide
 * este sistema por mí». Una tabla contesta eso de un vistazo —cuántas decisiones hay, qué política
 * resuelve cada una, cuál está configurada y cuál heredada del entorno— y deja el detalle para quien
 * entra a una fila. Tres formularios abiertos a la vez invitan a tocar antes de entender, que es
 * justo el orden equivocado para configurar quién evalúa a los clientes.
 *
 * ## Por qué el detalle es una vista aparte
 *
 * La explicación completa de una decisión —qué hace por dentro, un ejemplo donde se ve la
 * diferencia, qué endpoints la disparan y en qué punto del recorrido ocurre— no cabe en una fila sin
 * volverla ilegible, y comprimirla la convierte en decoración. Cada decisión tiene ademas su propia
 * URL, así que se puede enlazar en un ticket o en un acta de comité.
 */
const SOURCE_LABEL: Record<BindingSource, { text: string; tone: "success" | "warning" | "muted" }> = {
  binding: { text: "Elegido aquí", tone: "success" },
  // Que venga del entorno no es un error, pero sí algo que conviene ver: significa que nadie lo ha
  // decidido desde el portal y que cambiarlo hoy exige un despliegue.
  environment: { text: "Heredado del entorno", tone: "warning" },
  unset: { text: "Sin configurar", tone: "muted" },
};

const TH = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-atlas-muted";

export function DecisionArtifactsPage() {
  const artifacts = useDecisionArtifacts();
  const data = artifacts.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Motor de decisiones"
        description="Las decisiones que Atlas delega en el motor: qué política resuelve cada una, quién la llama y en qué punto del recorrido ocurre."
      />

      {artifacts.isLoading ? <LoadingSkeleton rows={4} /> : null}

      {artifacts.error ? (
        <ErrorState
          title="No pudimos leer el catálogo"
          description="El servicio interno no respondió. Vuelve a intentarlo en unos segundos."
        />
      ) : null}

      {data ? (
        <Card testId="decision-catalog">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-atlas-border">
                    <th className={TH}>Decisión</th>
                    <th className={TH}>Artefacto que la resuelve</th>
                    <th className={TH}>Versión</th>
                    <th className={TH}>Flujo de trabajo</th>
                    <th className={TH}>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bindings.map((binding) => {
                    const origen = SOURCE_LABEL[binding.source];
                    return (
                      <tr
                        key={binding.decisionType}
                        className="border-b border-atlas-border/60 transition-colors last:border-0 hover:bg-atlas-soft"
                      >
                        <td className="px-4 py-3">
                          {/*
                            La celda del nombre es el enlace: es el gesto principal de la tabla y no
                            debe competir con un boton al final de la fila.
                          */}
                          <Link
                            href={`/internal/settings/decision-artifacts/${binding.decisionType}`}
                            className="block"
                            data-testid={`decision-row-${binding.decisionType}`}
                          >
                            <span className="font-medium text-atlas-text">{binding.title ?? binding.decisionType}</span>
                            <span className="mt-0.5 block text-xs text-atlas-muted">{binding.description}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-atlas-text">{binding.artifactCode ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-atlas-muted">
                          {binding.pinnedVersion ? `Fijada ${binding.pinnedVersion}` : "Vigente del despliegue"}
                        </td>
                        <td className="px-4 py-3 text-xs text-atlas-muted">{binding.workflowStage ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge tone={origen.tone}>{origen.text}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-atlas-muted">
        Entra en una decisión para ver qué hace por dentro, qué endpoints la disparan y para elegir el artefacto y la
        versión que la resuelven.
      </p>
    </div>
  );
}
