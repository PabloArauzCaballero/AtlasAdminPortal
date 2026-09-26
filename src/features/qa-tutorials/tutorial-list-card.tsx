"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { statusVisual } from "./status-visuals";
import { useTutorial } from "./tutorial-provider";
import type { TutorialDefinition } from "./types";

const levelLabel: Record<TutorialDefinition["level"], string> = {
  basic: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

/** Ficha de un tutorial en el Centro de aprendizaje. */
export function TutorialListCard({
  tutorial,
}: Readonly<{ tutorial: TutorialDefinition }>) {
  const { start, statusFor, percentFor } = useTutorial();
  const status = statusFor(tutorial.id);
  const visual = statusVisual(status);
  const percent = percentFor(tutorial.id);
  const { Icon } = visual;

  return (
    <article className="flex flex-col rounded-2xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-atlas-border bg-atlas-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-atlas-muted">
            {tutorial.module}
            {tutorial.tab ? ` · ${tutorial.tab}` : ""}
          </span>
          <span className="rounded-md border border-atlas-border bg-atlas-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-atlas-muted">
            {levelLabel[tutorial.level]}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold ${visual.chipClass}`}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {visual.label}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-atlas-text">
        {tutorial.title}
      </h3>
      <p className="mt-1 flex-1 text-xs leading-5 text-atlas-muted">
        {tutorial.description}
      </p>

      <div className="mt-2 flex items-center gap-2 text-[0.6875rem] text-atlas-muted">
        <Clock className="h-3 w-3" aria-hidden />
        <span>~{tutorial.estimatedMinutes ?? tutorial.steps.length} min</span>
        <span>·</span>
        <span>{tutorial.steps.length} pasos</span>
      </div>

      {percent > 0 && status !== "completed" ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-atlas-soft">
          <div
            className="h-full rounded-full bg-atlas-accent"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => start(tutorial.id)}
        >
          {visual.actionLabel}
        </Button>
        <Link href={tutorial.route} aria-label={`Ir a ${tutorial.tool}`}>
          <Button variant="secondary">
            <ExternalLink className="h-4 w-4" />
            Herramienta
          </Button>
        </Link>
      </div>
    </article>
  );
}
