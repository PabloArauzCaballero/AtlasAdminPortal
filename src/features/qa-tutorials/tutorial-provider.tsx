"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getTutorial } from "./catalog";
import { matchesLocation } from "./dom-utils";
import { readActiveRun, writeActiveRun } from "./progress-storage";
import {
  initialEngineState,
  isLastStep,
  progressAfterStep,
  progressOnSkip,
  progressOnStart,
  tutorialReducer,
  type EngineState,
} from "./tutorial-engine";
import { useTutorialProgress } from "./use-tutorial-progress";
import { useTutorialRuntime } from "./use-tutorial-runtime";
import { SpotlightOverlay } from "./spotlight-overlay";
import type {
  TutorialDefinition,
  TutorialProgress,
  TutorialStatus,
  TutorialStep,
} from "./types";

type TutorialContextValue = Readonly<{
  activeDefinition: TutorialDefinition | null;
  currentStep: TutorialStep | undefined;
  stepIndex: number;
  phase: EngineState["phase"];
  isLast: boolean;
  /** Arranca o RETOMA (sin `stepIndex`, sigue en el último paso guardado). */
  start: (tutorialId: string, stepIndex?: number) => void;
  next: () => void;
  prev: () => void;
  skipStep: () => void;
  skipTutorial: () => void;
  close: () => void;
  /** Navega a la ruta/pestaña que el paso actual necesita («Llévame ahí»). */
  locate: () => void;
  statusFor: (tutorialId: string) => TutorialStatus;
  percentFor: (tutorialId: string) => number;
}>;

const TutorialContext = createContext<TutorialContextValue | null>(null);

function nowIso(): string {
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
function routeForStep(
  definition: TutorialDefinition,
  step: TutorialStep | undefined,
): string {
  return step?.nextRoute ?? definition.route;
}

export function TutorialProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { getProgress, statusFor, saveProgress } = useTutorialProgress();
  const [state, dispatch] = useReducer(
    (prev: EngineState, action: Parameters<typeof tutorialReducer>[2]) => {
      // En START la definición es la del tutorial entrante; en el resto, la del
      // tutorial activo. Sin esto, el primer START no encontraría definición.
      const id = action.type === "START" ? action.tutorialId : prev.tutorialId;
      return tutorialReducer(id ? getTutorial(id) : undefined, prev, action);
    },
    initialEngineState,
  );

  const activeDefinition = state.tutorialId
    ? (getTutorial(state.tutorialId) ?? null)
    : null;
  const currentStep = activeDefinition?.steps[state.stepIndex];
  const isLast = activeDefinition
    ? isLastStep(activeDefinition, state.stepIndex)
    : false;

  // Restaura la corrida que hubiera quedado abierta (F5, remontaje del árbol).
  useEffect(() => {
    const saved = readActiveRun();
    if (saved && getTutorial(saved.tutorialId)) {
      dispatch({
        type: "START",
        tutorialId: saved.tutorialId,
        stepIndex: saved.stepIndex,
      });
    }
  }, []);

  // Y guarda la actual en cada cambio (o la borra al cerrar/terminar).
  useEffect(() => {
    writeActiveRun(
      state.tutorialId && state.phase !== "completed"
        ? { tutorialId: state.tutorialId, stepIndex: state.stepIndex }
        : null,
    );
  }, [state.tutorialId, state.stepIndex, state.phase]);

  const persistStep = useCallback(
    (definition: TutorialDefinition, index: number) => {
      saveProgress(
        progressAfterStep(
          definition,
          getProgress(definition.id),
          index,
          nowIso(),
        ),
      );
    },
    [getProgress, saveProgress],
  );

  const navigateTo = useCallback(
    (target: string) => {
      const here = { pathname, search: window.location.search };
      if (!matchesLocation(here, target)) router.push(target);
    },
    [pathname, router],
  );

  const start = useCallback(
    (tutorialId: string, stepIndex?: number) => {
      const definition = getTutorial(tutorialId);
      if (!definition) return;
      const previous = getProgress(tutorialId);
      const index = stepIndex ?? resumeStepFor(definition, previous);
      // Lleva al usuario a la herramienta (y pestaña) del paso: así lo que el
      // recorrido resalta existe en pantalla. El provider vive por encima del
      // shell, así que la navegación no lo desmonta.
      navigateTo(routeForStep(definition, definition.steps[index]));
      dispatch({ type: "START", tutorialId, stepIndex: index });
      saveProgress(progressOnStart(definition, previous, nowIso()));
    },
    [getProgress, saveProgress, navigateTo],
  );

  const advance = useCallback(() => {
    if (!activeDefinition) return;
    const last = isLastStep(activeDefinition, state.stepIndex);
    dispatch({ type: "NEXT" });
    persistStep(activeDefinition, last ? state.stepIndex : state.stepIndex + 1);
  }, [activeDefinition, state.stepIndex, persistStep]);

  const prev = useCallback(() => {
    if (!activeDefinition || state.stepIndex === 0) return;
    dispatch({ type: "PREV" });
    persistStep(activeDefinition, state.stepIndex - 1);
  }, [activeDefinition, state.stepIndex, persistStep]);

  const skipTutorial = useCallback(() => {
    if (activeDefinition) {
      saveProgress(
        progressOnSkip(
          activeDefinition,
          getProgress(activeDefinition.id),
          state.stepIndex,
          nowIso(),
        ),
      );
    }
    dispatch({ type: "CLOSE" });
  }, [activeDefinition, state.stepIndex, getProgress, saveProgress]);

  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const setMissing = useCallback(
    (missing: boolean) => dispatch({ type: "SET_MISSING", missing }),
    [],
  );
  const alreadyDone = useCallback(
    () => dispatch({ type: "ACTION_ALREADY_DONE" }),
    [],
  );
  const locate = useCallback(() => {
    if (!activeDefinition) return;
    router.push(routeForStep(activeDefinition, currentStep));
  }, [activeDefinition, currentStep, router]);
  // «Llévame ahí» sólo tiene sentido si el paso vive en OTRA ruta/pestaña; si
  // ya estamos en la suya y aun así no hay nada, es que faltan datos.
  const canLocate = Boolean(
    activeDefinition &&
    typeof window !== "undefined" &&
    !matchesLocation(
      { pathname, search: window.location.search },
      routeForStep(activeDefinition, currentStep),
    ),
  );

  useTutorialRuntime({
    step: currentStep,
    phase: state.phase,
    onSatisfied: advance,
    onAlreadyDone: alreadyDone,
  });

  const value = useMemo<TutorialContextValue>(
    () => ({
      activeDefinition,
      currentStep,
      stepIndex: state.stepIndex,
      phase: state.phase,
      isLast,
      start,
      next: advance,
      prev,
      skipStep: advance,
      skipTutorial,
      close,
      locate,
      statusFor,
      percentFor: (id: string) => getProgress(id)?.percent ?? 0,
    }),
    [
      activeDefinition,
      currentStep,
      state.stepIndex,
      state.phase,
      isLast,
      start,
      advance,
      prev,
      skipTutorial,
      close,
      locate,
      statusFor,
      getProgress,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {activeDefinition && currentStep ? (
        <SpotlightOverlay
          step={currentStep}
          phase={state.phase}
          stepIndex={state.stepIndex}
          total={activeDefinition.steps.length}
          title={activeDefinition.title}
          isLast={isLast}
          onNext={advance}
          onPrev={prev}
          onSkipStep={advance}
          onSkipTutorial={skipTutorial}
          onClose={close}
          onLocate={locate}
          canLocate={canLocate}
          onMissingChange={setMissing}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial debe usarse dentro de TutorialProvider.");
  }
  return context;
}
