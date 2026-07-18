import { afterEach, describe, expect, it, vi } from "vitest";
import { consoleSink } from "@/shared/observability/console-sink";
import type { ObservabilityEvent } from "@/shared/observability/reporter";

function makeEvent(
  overrides: Partial<ObservabilityEvent> = {},
): ObservabilityEvent {
  return {
    type: "route_error",
    name: "Error",
    message: "boom",
    context: { route: "/internal", environment: "local" },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("consoleSink", () => {
  it("imprime el evento con su tipo y mensaje", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleSink(makeEvent());

    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).toContain("[obs:route_error]");
    expect(String(spy.mock.calls[0][0])).toContain("boom");
  });

  it("adjunta el contexto ya redactado del reporter", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleSink(makeEvent({ requestId: "req_1", status: 500 }));

    const detail = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(detail.requestId).toBe("req_1");
    expect(detail.status).toBe(500);
    expect(detail.route).toBe("/internal");
  });
});
