"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { getTutorial } from "./catalog";
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
import type { TutorialDefinition, TutorialStatus, TutorialStep } from "./types";

type TutorialContextValue = Readonly<{
  activeDefinition: TutorialDefinition | null;
  currentStep: TutorialStep | undefined;
  stepIndex: number;
  phase: EngineState["phase"];
  isLast: boolean;
  start: (tutorialId: string, stepIndex?: number) => void;
  next: () => void;
  prev: () => void;
  skipStep: () => void;
  skipTutorial: () => void;
  close: () => void;
  statusFor: (tutorialId: string) => TutorialStatus;
  percentFor: (tutorialId: string) => number;
}>;

const TutorialContext = createContext<TutorialContextValue | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

export function TutorialProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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

  const start = useCallback(
    (tutorialId: string, stepIndex = 0) => {
      const definition = getTutorial(tutorialId);
      if (!definition) return;
      dispatch({ type: "START", tutorialId, stepIndex });
      saveProgress(
        progressOnStart(definition, getProgress(tutorialId), nowIso()),
      );
    },
    [getProgress, saveProgress],
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

  useTutorialRuntime({
    step: currentStep,
    phase: state.phase,
    onSatisfied: advance,
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
