"use client";

import { ArrowRight, Target } from "lucide-react";
import { getGoalTutorials } from "./catalog";
import { statusVisual } from "./status-visuals";
import { useTutorial } from "./tutorial-provider";

/**
 * Launcher por objetivo: «¿Qué quieres hacer?». El usuario elige una tarea de
 * negocio y `start` navega a la herramienta correcta y arranca el recorrido.
 */
export function TutorialObjectiveLauncher() {
  const { start, statusFor } = useTutorial();
  const goals = getGoalTutorials();

  return (
    <section
      data-tutorial-id="objective-launcher"
      className="rounded-2xl border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-atlas-accent" aria-hidden />
        <h2 className="text-base font-semibold text-atlas-text">
          ¿Qué quieres hacer?
        </h2>
      </div>
      <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {goals.map((tutorial) => {
          const visual = statusVisual(statusFor(tutorial.id));
          return (
            <li key={tutorial.id}>
              <button
                type="button"
                onClick={() => start(tutorial.id)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-atlas-border bg-atlas-soft/40 p-3 text-left transition-colors hover:border-atlas-accent/40 hover:bg-atlas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-atlas-text">
                    {tutorial.goal}
                  </span>
                  <span className="mt-0.5 block text-xs text-atlas-muted">
                    {tutorial.title} · {visual.label}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-atlas-muted transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
