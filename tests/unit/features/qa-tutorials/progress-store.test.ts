import { describe, expect, it } from "vitest";
import {
  progressForUser,
  upsertProgress,
  type UserProgressStore,
} from "@/features/qa-tutorials/server/progress-store";
import type { TutorialProgress } from "@/features/qa-tutorials/types";

function progress(overrides: Partial<TutorialProgress> = {}): TutorialProgress {
  return {
    tutorialId: "t1",
    version: 1,
    status: "in-progress",
    lastStepIndex: 0,
    percent: 25,
    timesStarted: 1,
    ...overrides,
  };
}

describe("progress-store · fusión pura", () => {
  it("crea el usuario y guarda su progreso", () => {
    const store = upsertProgress({}, "u1", progress());
    expect(progressForUser(store, "u1")).toHaveLength(1);
  });

  it("upsert reemplaza el mismo tutorial y conserva los demás", () => {
    let store: UserProgressStore = upsertProgress({}, "u1", progress());
    store = upsertProgress(store, "u1", progress({ tutorialId: "t2" }));
    store = upsertProgress(store, "u1", progress({ percent: 80 }));

    const items = progressForUser(store, "u1");
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.tutorialId === "t1")?.percent).toBe(80);
  });

  it("aísla el progreso por usuario", () => {
    let store = upsertProgress({}, "u1", progress());
    store = upsertProgress(store, "u2", progress({ tutorialId: "t9" }));
    expect(progressForUser(store, "u1")).toHaveLength(1);
    expect(progressForUser(store, "u2")).toHaveLength(1);
    expect(progressForUser(store, "u3")).toHaveLength(0);
  });
});
