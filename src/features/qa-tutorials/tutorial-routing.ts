import type {
  TutorialDefinition,
  TutorialProgress,
  TutorialStep,
} from "./types";

export function nowIso(): string {
  return new Date().toISOString();
}

/** Paso en el que retomar: el último visto si quedó a medias; 0 si no. */
export function resumeStepFor(
  definition: TutorialDefinition,
  progress: TutorialProgress | undefined,
): number {
  if (!progress) return 0;
  if (progress.status !== "in-progress" && progress.status !== "skipped") {
    return 0;
  }
  return Math.max(
    0,
    Math.min(progress.lastStepIndex, definition.steps.length - 1),
  );
}

/** A dónde tiene que estar el usuario para ver el paso: su pestaña o la herramienta. */
export function routeForStep(
  definition: TutorialDefinition,
  step: TutorialStep | undefined,
): string {
  return step?.nextRoute ?? definition.route;
}
