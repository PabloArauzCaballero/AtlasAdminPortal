import { describe, expect, it } from "vitest";
import { campaignShares } from "@/features/qa-runs/campaign-catalog";
import {
  describeRunEvent,
  mergeRunEvents,
} from "@/features/qa-runs/run-events";

const ev = (sequence: number, type = "PERSONA_FINISHED") => ({
  sequence,
  type,
  payload: {},
  createdAt: "2026-09-24T12:00:00.000Z",
});

describe("mergeRunEvents", () => {
  it("suma lo nuevo, deduplica por sequence y ordena", () => {
    const merged = mergeRunEvents(
      { items: [ev(1), ev(2)], cursor: 2 },
      { items: [ev(2), ev(4), ev(3)], nextCursor: 4 },
    );
    expect(merged.items.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(merged.cursor).toBe(4);
  });

  it("el cursor nunca retrocede con una página vacía o atrasada", () => {
    const merged = mergeRunEvents(
      { items: [ev(1), ev(2), ev(3)], cursor: 3 },
      { items: [], nextCursor: 1 },
    );
    expect(merged.cursor).toBe(3);
    expect(merged.items).toHaveLength(3);
  });
});

describe("describeRunEvent", () => {
  it("un tipo desconocido se muestra con su código, sin inventar detalle", () => {
    expect(describeRunEvent(ev(9, "SOMETHING_NEW"))).toEqual({
      label: "SOMETHING_NEW",
      detail: null,
    });
  });

  it("RUN_FINISHED sin veredicto lo dice", () => {
    const view = describeRunEvent({
      ...ev(5, "RUN_FINISHED"),
      payload: { status: "CANCELLED", verdict: null },
    });
    expect(view.label).toBe("Corrida terminada");
    expect(view.detail).toBe("CANCELLED · sin veredicto");
  });
});

describe("campaignShares", () => {
  it("reparte en porcentaje por peso relativo", () => {
    const shares = campaignShares({
      code: "c",
      name: "C",
      description: "",
      templates: [
        { code: "a", version: "1", share: 1 },
        { code: "b", version: "1", share: 1 },
        { code: "c", version: "1", share: 2 },
      ],
    });
    expect(shares.map((s) => s.percent)).toEqual([25, 25, 50]);
  });

  it("con pesos a cero no divide entre cero", () => {
    const shares = campaignShares({
      code: "c",
      name: "C",
      description: "",
      templates: [{ code: "a", version: "1", share: 0 }],
    });
    expect(shares[0].percent).toBe(0);
  });
});
