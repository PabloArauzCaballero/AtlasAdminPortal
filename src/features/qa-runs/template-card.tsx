"use client";

import { Database, Eye, ListOrdered, Play } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ACTOR_LABEL, DATASET_OPTIONS, matchedStepsLabel } from "./run-status";
import type { QaTemplateSummary } from "./types";

export type TemplateAction = "steps" | "data" | "preview" | "run";

/** Una receta del catálogo: qué recorre, quién actúa, cómo termina y si se puede ejecutar ya. */
export function TemplateCard({
  template,
  canRun,
  onAction,
}: Readonly<{
  template: QaTemplateSummary;
  /** Falso cuando el entorno no admite corridas: se ve el catálogo, no se ofrece ejecutar. */
  canRun: boolean;
  onAction: (action: TemplateAction, template: QaTemplateSummary) => void;
}>) {
  const ready = template.status === "READY";
  return (
    <Card testId={`qa-template-${template.code}`}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-atlas-text">
              {template.name}
            </h3>
            <p className="font-mono text-[0.6875rem] text-atlas-muted">
              {template.code} · v{template.version}
            </p>
          </div>
          <Badge
            tone={
              ready
                ? "success"
                : template.status === "DRAFT"
                  ? "muted"
                  : "warning"
            }
          >
            {ready
              ? "Lista"
              : template.status === "DRAFT"
                ? "Borrador"
                : "Bloqueada"}
          </Badge>
        </div>
        <p className="text-sm text-atlas-muted">{template.description}</p>
        <dl className="grid gap-1 text-xs text-atlas-muted">
          <div>
            <dt className="inline font-medium text-atlas-text">Alcance: </dt>
            <dd className="inline">
              {template.stepCount} pasos del flujo {template.workflowCode}
              {matchedStepsLabel(template)
                ? ` · ${matchedStepsLabel(template)}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-atlas-text">Actúan: </dt>
            <dd className="inline">
              {template.actors
                .map((actor) => ACTOR_LABEL[actor] ?? actor)
                .join(", ")}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-atlas-text">Desenlace: </dt>
            <dd className="inline">{template.expectedTerminal}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-atlas-text">Datos: </dt>
            <dd className="inline">
              {template.datasetModes
                .map((mode) => DATASET_OPTIONS[mode]?.label ?? mode)
                .join(", ")}
            </dd>
          </div>
        </dl>
        {!ready && template.blockedReasons.length > 0 ? (
          <ul
            className="list-disc space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 py-2 pl-6 pr-2 text-xs text-amber-900"
            aria-label={`Motivos por los que ${template.name} no está lista`}
          >
            {template.blockedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button
            className="h-8 px-2.5 text-xs"
            onClick={() => onAction("steps", template)}
          >
            <ListOrdered className="h-3.5 w-3.5" aria-hidden />
            Ver pasos
          </Button>
          <Button
            className="h-8 px-2.5 text-xs"
            onClick={() => onAction("data", template)}
          >
            <Database className="h-3.5 w-3.5" aria-hidden />
            Ver datos
          </Button>
          <Button
            className="h-8 px-2.5 text-xs"
            disabled={!canRun || !ready}
            onClick={() => onAction("preview", template)}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Previsualizar
          </Button>
          <Button
            variant="primary"
            className="h-8 px-2.5 text-xs"
            disabled={!canRun || !ready}
            onClick={() => onAction("run", template)}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Ejecutar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
