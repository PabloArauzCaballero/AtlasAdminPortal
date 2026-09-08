"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { DecisionArtifactBinding } from "./types";

const API_DOCS =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") ?? "";
const ENGINE_URL =
  process.env.NEXT_PUBLIC_DECISION_ENGINE_URL ?? "http://localhost:5173";

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
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card testId="decision-endpoints">
        <CardHeader>
          <h3 className="text-sm font-semibold text-atlas-text">
            Endpoints que la llaman
          </h3>
          <p className="text-xs text-atlas-muted">
            Si cambias esta política, esto es lo que se ve afectado.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {(binding.consumerEndpoints ?? []).map((endpoint) => (
              <li key={`${endpoint.method}-${endpoint.path}`}>
                <a
                  href={`${API_DOCS}/docs`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-atlas-accent hover:underline"
                >
                  {endpoint.method} {endpoint.path}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
                <p className="mt-0.5 text-xs text-atlas-muted">
                  {endpoint.purpose}
                </p>
              </li>
            ))}
          </ul>
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
          <a
            href={`${ENGINE_URL}/executions`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-atlas-accent hover:underline"
          >
            Ver las ejecuciones de esta política en el motor
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
