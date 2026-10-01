"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { engineUrl } from "@/shared/decision-engine/engine-links";
import { ConsumerEndpointsTable } from "./consumer-endpoints-table";
import type { DecisionArtifactBinding } from "./types";

/**
 * Quién llama a esta decisión y en qué punto del recorrido ocurre.
 *
 * Vive fuera de la página sólo por tamaño. Los dos enlaces salen del portal —a la documentación
 * viva de la API y al motor de decisiones— y por eso llevan el icono de enlace externo en lugar
 * de una flecha escrita: es la misma señal que usan el resto de saltos fuera del portal.
 */
export function DecisionConsumersSection({
  binding,
}: Readonly<{ binding: DecisionArtifactBinding }>) {
  // Sin `NEXT_PUBLIC_DECISION_ENGINE_URL` no hay enlace: antes caía a `http://localhost:5173`, que en
  // producción lleva a una pantalla que no existe. Es el mismo criterio del resto de saltos al Motor.
  const ejecucionesUrl = engineUrl("/executions");
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card testId="decision-endpoints">
        <CardHeader>
          <h3 className="text-sm font-semibold text-atlas-text">
            Operaciones que la llaman
          </h3>
          <p className="text-xs text-atlas-muted">
            Si cambias esta política, esto es lo que se ve afectado.
          </p>
        </CardHeader>
        <CardContent>
          <ConsumerEndpointsTable endpoints={binding.consumerEndpoints ?? []} />
        </CardContent>
      </Card>

      <Card testId="decision-workflow">
        <CardHeader>
          <h3 className="text-sm font-semibold text-atlas-text">
            Flujo de trabajo
          </h3>
          <p className="text-xs text-atlas-muted">{binding.workflowStage}</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {(binding.workflowSteps ?? []).map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-atlas-text">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atlas-soft text-xs font-semibold text-atlas-muted">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {ejecucionesUrl ? (
            <a
              href={ejecucionesUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-atlas-accent hover:underline"
            >
              Ver las ejecuciones de esta política en el motor
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
