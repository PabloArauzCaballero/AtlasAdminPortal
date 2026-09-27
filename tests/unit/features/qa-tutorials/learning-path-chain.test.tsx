import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { learningPaths } from "@/features/qa-tutorials/learning-paths";
import { readPathQueue } from "@/features/qa-tutorials/progress-storage";
import { usePathQueue } from "@/features/qa-tutorials/use-path-queue";
import { mergeProgress } from "@/features/qa-tutorials/use-tutorial-progress";
import type { TutorialProgress } from "@/features/qa-tutorials/types";

beforeEach(() => window.sessionStorage.clear());

describe("recorridos sugeridos encadenados", () => {
  it("«Empezar recorrido» arranca el primero y deja el resto en cola", () => {
    const start = vi.fn();
    const { result } = renderHook(() => usePathQueue(start));
    act(() => result.current.startPath("primeros-pasos"));

    expect(start).toHaveBeenCalledWith("qa-lab-overview");
    expect(result.current.nextTitle).toBe("Probar una operación (funcional)");
    expect(readPathQueue()?.remaining).toEqual([
      "qa-lab-functional",
      "qa-lab-stress",
    ]);
  });

  it("al continuar arranca el siguiente, y así hasta el último", () => {
    const start = vi.fn();
    const { result } = renderHook(() => usePathQueue(start));
    act(() => result.current.startPath("primeros-pasos"));
    act(() => result.current.continuePath());
    expect(start).toHaveBeenLastCalledWith("qa-lab-functional");
    act(() => result.current.continuePath());
    expect(start).toHaveBeenLastCalledWith("qa-lab-stress");
    expect(result.current.nextTitle).toBeNull();
  });

  it("«Primeros pasos» ya no termina en un tutorial de suites", () => {
    const path = learningPaths.find((item) => item.id === "primeros-pasos");
    expect(path?.tutorialIds).not.toContain("qa-runs-interpret");
  });

  it("abandonar el recorrido vacía la cola", () => {
    const { result } = renderHook(() => usePathQueue(vi.fn()));
    act(() => result.current.startPath("pruebas-api"));
    act(() => result.current.clearPath());
    expect(result.current.nextTitle).toBeNull();
    expect(readPathQueue()).toBeNull();
  });
});

describe("progreso: el navegador manda", () => {
  const base: TutorialProgress = {
    tutorialId: "qa-lab-functional",
    version: 3,
    status: "in-progress",
    lastStepIndex: 1,
    percent: 30,
    timesStarted: 1,
  };

  it("si el servidor perdió el progreso (despliegue), se conserva el del navegador", () => {
    const local = [{ ...base, lastActivityAt: "2026-09-26T10:00:00.000Z" }];
    expect(mergeProgress(local, [])).toEqual(local);
  });

  it("por tutorial gana la actividad más reciente", () => {
    const local = {
      ...base,
      status: "completed" as const,
      lastActivityAt: "2026-09-26T12:00:00.000Z",
    };
    const remote = { ...base, lastActivityAt: "2026-09-26T10:00:00.000Z" };
    expect(mergeProgress([local], [remote])).toEqual([local]);
  });
});
