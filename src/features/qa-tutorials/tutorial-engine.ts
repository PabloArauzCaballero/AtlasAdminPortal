/**
 * Máquina de estados pura del recorrido activo. Sin DOM, sin React: sólo
 * transiciones deterministas, para que sea 100% testeable en aislamiento.
 * Los efectos (observar el DOM, resaltar, persistir) viven en el runtime.
 */
import type {
  TutorialDefinition,
  TutorialProgress,
  TutorialStatus,
  TutorialStep,
} from "./types";

export type EnginePhase =
  | "idle"
  | "running" // paso mostrado, esperando Siguiente (acción `none`)
  | "awaiting-action" // esperando la acción real del usuario
  | "element-missing" // el target no está en el DOM (modo recuperación)
  | "completed";

export type EngineState = Readonly<{
  tutorialId: string | null;
  stepIndex: number;
  phase: EnginePhase;
}>;

export type EngineAction =
  | { type: "START"; tutorialId: string; stepIndex?: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SKIP_STEP" }
  | { type: "ACTION_SATISFIED" }
  | { type: "SET_MISSING"; missing: boolean }
  | { type: "CLOSE" };

export const initialEngineState: EngineState = {
  tutorialId: null,
  stepIndex: 0,
  phase: "idle",
};

/** Fase inicial de un paso: si requiere acción del usuario, espera; si no, corre. */
export function phaseForStep(step: TutorialStep | undefined): EnginePhase {
  if (!step) return "completed";
  const action = step.requiredAction?.type ?? "none";
  return action === "none" ? "running" : "awaiting-action";
}

export function isLastStep(
  definition: TutorialDefinition,
  stepIndex: number,
): boolean {
  return stepIndex >= definition.steps.length - 1;
}

/** Porcentaje de avance (0–100) según el paso alcanzado. */
export function computePercent(
  definition: TutorialDefinition,
  stepIndex: number,
): number {
  const total = definition.steps.length;
  if (total === 0) return 100;
  const reached = Math.min(stepIndex + 1, total);
  return Math.round((reached / total) * 100);
}

function advance(
  definition: TutorialDefinition,
  state: EngineState,
): EngineState {
  if (isLastStep(definition, state.stepIndex)) {
    return { ...state, phase: "completed" };
  }
  const nextIndex = state.stepIndex + 1;
  return {
    ...state,
    stepIndex: nextIndex,
    phase: phaseForStep(definition.steps[nextIndex]),
  };
}

/**
 * Reductor. Recibe la definición activa para poder calcular límites y la fase
 * del siguiente paso. Si no hay tutorial activo, sólo responde a START.
 */
export function tutorialReducer(
  definition: TutorialDefinition | undefined,
  state: EngineState,
  action: EngineAction,
): EngineState {
  if (action.type === "START") {
    if (!definition) return state;
    const stepIndex = clampStep(definition, action.stepIndex ?? 0);
    return {
      tutorialId: action.tutorialId,
      stepIndex,
      phase: phaseForStep(definition.steps[stepIndex]),
    };
  }
  if (action.type === "CLOSE") return initialEngineState;
  if (!definition || !state.tutorialId) return state;

  switch (action.type) {
    case "NEXT":
    case "SKIP_STEP":
    case "ACTION_SATISFIED":
      return advance(definition, state);
    case "PREV": {
      if (state.stepIndex === 0) return state;
      const prevIndex = state.stepIndex - 1;
      return {
        ...state,
        stepIndex: prevIndex,
        phase: phaseForStep(definition.steps[prevIndex]),
      };
    }
    case "SET_MISSING":
      return {
        ...state,
        phase: action.missing
          ? "element-missing"
          : phaseForStep(definition.steps[state.stepIndex]),
      };
    default:
      return state;
  }
}

function clampStep(definition: TutorialDefinition, index: number): number {
  return Math.max(0, Math.min(index, definition.steps.length - 1));
}

/** Deriva el estado de progreso a persistir tras alcanzar `stepIndex`. */
export function progressAfterStep(
  definition: TutorialDefinition,
  previous: TutorialProgress | undefined,
  stepIndex: number,
  now: string,
): TutorialProgress {
  const completed = isLastStep(definition, stepIndex);
  const status: TutorialStatus = completed ? "completed" : "in-progress";
  return {
    tutorialId: definition.id,
    version: definition.version,
    status,
    lastStepIndex: stepIndex,
    percent: computePercent(definition, stepIndex),
    startedAt: previous?.startedAt ?? now,
    completedAt: completed ? now : previous?.completedAt,
    skippedAt: previous?.skippedAt,
    timesStarted: previous?.timesStarted ?? 0,
    lastActivityAt: now,
  };
}

/** Marca un tutorial como iniciado (incrementa el contador). */
export function progressOnStart(
  definition: TutorialDefinition,
  previous: TutorialProgress | undefined,
  now: string,
): TutorialProgress {
  return {
    tutorialId: definition.id,
    version: definition.version,
    status: "in-progress",
    lastStepIndex: previous?.lastStepIndex ?? 0,
    percent: previous?.percent ?? 0,
    startedAt: previous?.startedAt ?? now,
    completedAt: previous?.completedAt,
    skippedAt: previous?.skippedAt,
    timesStarted: (previous?.timesStarted ?? 0) + 1,
    lastActivityAt: now,
  };
}

/** Marca un tutorial como omitido, conservando el último paso alcanzado. */
export function progressOnSkip(
  definition: TutorialDefinition,
  previous: TutorialProgress | undefined,
  stepIndex: number,
  now: string,
): TutorialProgress {
  return {
    tutorialId: definition.id,
    version: definition.version,
    status: "skipped",
    lastStepIndex: stepIndex,
    percent: computePercent(definition, stepIndex),
    startedAt: previous?.startedAt ?? now,
    completedAt: previous?.completedAt,
    skippedAt: now,
    timesStarted: previous?.timesStarted ?? 1,
    lastActivityAt: now,
  };
}

/**
 * Reconcilia el progreso guardado con la versión vigente del tutorial: si el
 * usuario completó/omitió una versión anterior, se marca "needs-update".
 */
export function reconcileVersion(
  definition: TutorialDefinition,
  previous: TutorialProgress | undefined,
): TutorialStatus {
  if (!previous) return "not-started";
  if (previous.version < definition.version) {
    return previous.status === "completed" ? "needs-update" : previous.status;
  }
  return previous.status;
}
