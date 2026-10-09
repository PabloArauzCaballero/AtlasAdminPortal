import { describe, expect, it } from "vitest";
import {
  MAX_TUTORIALS_PER_USER,
  MAX_USERS,
  ProgressLimitError,
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

describe("progress-store · topes (ADM-04)", () => {
  it("un tutorial nuevo por encima del máximo del usuario se rechaza; uno existente se actualiza", () => {
    const entries = Object.fromEntries(
      Array.from({ length: MAX_TUTORIALS_PER_USER }, (_, i) => [
        `t${i}`,
        progress({ tutorialId: `t${i}` }),
      ]),
    );
    const store: UserProgressStore = { u1: entries };
    expect(() =>
      upsertProgress(store, "u1", progress({ tutorialId: "nuevo" })),
    ).toThrow(ProgressLimitError);
    const actualizado = upsertProgress(
      store,
      "u1",
      progress({ tutorialId: "t0", percent: 99 }),
    );
    expect(actualizado.u1?.t0?.percent).toBe(99);
  });

  it("con el máximo de usuarios, uno nuevo desplaza al de actividad más vieja", () => {
    const store: UserProgressStore = Object.fromEntries(
      Array.from({ length: MAX_USERS }, (_, i) => [
        `u${i}`,
        {
          t1: progress({
            lastActivityAt: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}.${String(i).padStart(3, "0")}Z`,
          }),
        },
      ]),
    );
    const next = upsertProgress(store, "nuevo", progress());
    expect(Object.keys(next)).toHaveLength(MAX_USERS);
    expect(next.nuevo).toBeDefined();
    expect(next.u0).toBeUndefined();
  });

  it("un usuario ya presente no desplaza a nadie", () => {
    const store: UserProgressStore = Object.fromEntries(
      Array.from({ length: MAX_USERS }, (_, i) => [
        `u${i}`,
        { t1: progress() },
      ]),
    );
    const next = upsertProgress(store, "u3", progress({ tutorialId: "t2" }));
    expect(Object.keys(next)).toHaveLength(MAX_USERS);
  });

  it("un userId como `constructor` no hereda nada del prototipo", () => {
    expect(progressForUser({}, "constructor")).toEqual([]);
    const next = upsertProgress({}, "constructor", progress());
    expect(progressForUser(next, "constructor")).toHaveLength(1);
  });
});
