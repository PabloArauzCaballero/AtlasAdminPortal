import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUEUE_RUN_ADVANCED,
  parseQueueRunAdvanced,
  type QueueRunAdvancedState,
} from "@/features/qa-stress/queue-run-advanced-fields";

function state(
  overrides: Partial<QueueRunAdvancedState> = {},
): QueueRunAdvancedState {
  return { ...DEFAULT_QUEUE_RUN_ADVANCED, ...overrides };
}

describe("parseQueueRunAdvanced", () => {
  it("con los defaults, produce un payload y unos headers vacíos", () => {
    const parsed = parseQueueRunAdvanced(state());

    expect(parsed).toEqual({ ok: true, payload: {}, headers: {} });
  });

  it("parsea un payload y unos headers reales, incluido un escenario del mock", () => {
    const parsed = parseQueueRunAdvanced(
      state({
        payloadText: '{"input":{"documentNumber":"1"}}',
        headersText: '{"x-mock-scenario":"provider_down"}',
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      payload: { input: { documentNumber: "1" } },
      headers: { "x-mock-scenario": "provider_down" },
    });
  });

  it("un payload roto se reporta como error, no se deja pasar como {}", () => {
    const parsed = parseQueueRunAdvanced(state({ payloadText: "{no json" }));

    expect(parsed).toEqual({
      ok: false,
      error: "El payload no es JSON válido.",
    });
  });

  it("unos headers rotos se reportan como error propio, distinto del de payload", () => {
    const parsed = parseQueueRunAdvanced(state({ headersText: "{no json" }));

    expect(parsed).toEqual({
      ok: false,
      error: "Los headers no son JSON válido.",
    });
  });

  it("unos headers que no son un objeto (un array) se rechazan", () => {
    const parsed = parseQueueRunAdvanced(state({ headersText: "[1,2,3]" }));

    expect(parsed.ok).toBe(false);
  });
});
