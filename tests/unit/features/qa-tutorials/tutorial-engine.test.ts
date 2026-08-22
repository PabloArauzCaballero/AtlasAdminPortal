import { describe, expect, it } from "vitest";
import {
  computePercent,
  initialEngineState,
  isLastStep,
  phaseForStep,
  progressAfterStep,
  progressOnSkip,
  progressOnStart,
  reconcileVersion,
  tutorialReducer,
} from "@/features/qa-tutorials/tutorial-engine";
import type { TutorialDefinition } from "@/features/qa-tutorials/types";

const def: TutorialDefinition = {
  id: "t",
  module: "M",
  tool: "Tool",
  title: "T",
  description: "d",
  level: "basic",
  version: 2,
  route: "/r",
  steps: [
    { id: "s0", title: "s0", content: "c" },
    {
      id: "s1",
      title: "s1",
      content: "c",
      requiredAction: { type: "click", targetId: "x" },
    },
    { id: "s2", title: "s2", content: "c" },
  ],
};

describe("tutorial-engine · fases y navegación", () => {
  it("phaseForStep espera acción sólo si el paso la exige", () => {
    expect(phaseForStep(def.steps[0])).toBe("running");
    expect(phaseForStep(def.steps[1])).toBe("awaiting-action");
    expect(phaseForStep(undefined)).toBe("completed");
  });

  it("computePercent avanza con el paso alcanzado", () => {
    expect(computePercent(def, 0)).toBe(33);
    expect(computePercent(def, 2)).toBe(100);
  });

  it("isLastStep detecta el final", () => {
    expect(isLastStep(def, 1)).toBe(false);
    expect(isLastStep(def, 2)).toBe(true);
  });

  it("START coloca el paso y su fase", () => {
    const state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
    });
    expect(state).toMatchObject({
      tutorialId: "t",
      stepIndex: 0,
      phase: "running",
    });
  });

  it("NEXT en un paso con acción cae en awaiting-action", () => {
    let state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
    });
    state = tutorialReducer(def, state, { type: "NEXT" });
    expect(state.stepIndex).toBe(1);
    expect(state.phase).toBe("awaiting-action");
  });

  it("ACTION_SATISFIED avanza el paso bloqueado", () => {
    let state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
      stepIndex: 1,
    });
    expect(state.phase).toBe("awaiting-action");
    state = tutorialReducer(def, state, { type: "ACTION_SATISFIED" });
    expect(state.stepIndex).toBe(2);
  });

  it("NEXT en el último paso completa", () => {
    let state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
      stepIndex: 2,
    });
    state = tutorialReducer(def, state, { type: "NEXT" });
    expect(state.phase).toBe("completed");
  });

  it("PREV no baja de 0 y CLOSE reinicia", () => {
    let state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
    });
    state = tutorialReducer(def, state, { type: "PREV" });
    expect(state.stepIndex).toBe(0);
    state = tutorialReducer(def, state, { type: "CLOSE" });
    expect(state).toEqual(initialEngineState);
  });

  it("SET_MISSING alterna recuperación y vuelve a la fase del paso", () => {
    let state = tutorialReducer(def, initialEngineState, {
      type: "START",
      tutorialId: "t",
    });
    state = tutorialReducer(def, state, { type: "SET_MISSING", missing: true });
    expect(state.phase).toBe("element-missing");
    state = tutorialReducer(def, state, {
      type: "SET_MISSING",
      missing: false,
    });
    expect(state.phase).toBe("running");
  });
});

describe("tutorial-engine · progreso persistido", () => {
  const now = "2026-07-24T00:00:00.000Z";

  it("progressOnStart incrementa timesStarted", () => {
    const first = progressOnStart(def, undefined, now);
    expect(first.timesStarted).toBe(1);
    const second = progressOnStart(def, first, now);
    expect(second.timesStarted).toBe(2);
  });

  it("progressAfterStep marca completed en el último paso", () => {
    const mid = progressAfterStep(def, undefined, 1, now);
    expect(mid.status).toBe("in-progress");
    const end = progressAfterStep(def, mid, 2, now);
    expect(end.status).toBe("completed");
    expect(end.completedAt).toBe(now);
    expect(end.percent).toBe(100);
  });

  it("progressOnSkip conserva el paso y marca skipped", () => {
    const skipped = progressOnSkip(def, undefined, 1, now);
    expect(skipped.status).toBe("skipped");
    expect(skipped.lastStepIndex).toBe(1);
  });

  it("reconcileVersion marca needs-update si se completó una versión anterior", () => {
    const old = progressAfterStep({ ...def, version: 1 }, undefined, 2, now);
    expect(reconcileVersion(def, old)).toBe("needs-update");
    expect(reconcileVersion(def, undefined)).toBe("not-started");
  });
});
