import { afterEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { redactSensitive, redactString } from "@/shared/observability/redact";
import {
  reportEvent,
  setObservabilitySink,
  type ObservabilityEvent,
} from "@/shared/observability/reporter";

afterEach(() => {
  setObservabilitySink(null);
  vi.unstubAllEnvs();
});

describe("redactSensitive", () => {
  it("enmascara claves sensibles por nombre", () => {
    const out = redactSensitive({
      authorization: "Bearer abc.def",
      password: "s3cr3t",
      accessToken: "tok",
      email: "a@b.invalid",
      seguro: "visible",
    }) as Record<string, string>;

    expect(out.authorization).toBe("[redactado]");
    expect(out.password).toBe("[redactado]");
    expect(out.accessToken).toBe("[redactado]");
    expect(out.email).toBe("[redactado]");
    expect(out.seguro).toBe("visible");
  });

  it("redacta en profundidad (objetos anidados y arrays)", () => {
    const out = redactSensitive({
      user: { email: "a@b.invalid", name: "Ana" },
      tokens: [{ refreshToken: "r1" }],
    }) as { user: Record<string, string>; tokens: Record<string, string>[] };

    expect(out.user.email).toBe("[redactado]");
    expect(out.user.name).toBe("Ana");
    expect(out.tokens[0].refreshToken).toBe("[redactado]");
  });

  it("no cuelga con estructuras muy profundas", () => {
    let nested: Record<string, unknown> = { fin: "x" };
    for (let i = 0; i < 20; i += 1) nested = { child: nested };
    expect(() => redactSensitive(nested)).not.toThrow();
  });
});

describe("redactString", () => {
  it("enmascara un Bearer token en texto libre", () => {
    expect(redactString("Authorization: Bearer abc.def-123")).toBe(
      "Authorization: Bearer [redactado]",
    );
  });

  it("deja el texto sin tokens intacto", () => {
    expect(redactString("fallo de red")).toBe("fallo de red");
  });
});

describe("reportEvent", () => {
  function capture() {
    const events: ObservabilityEvent[] = [];
    setObservabilitySink((event) => events.push(event));
    return events;
  }

  it("entrega el evento al sink registrado", () => {
    const events = capture();
    reportEvent("route_error", new Error("boom"));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "route_error", message: "boom" });
  });

  it("con un AtlasApiError adjunta status, code y requestId", () => {
    const events = capture();
    reportEvent(
      "contract_error",
      new AtlasApiError({
        status: 0,
        code: "API_CONTRACT_ERROR",
        message: "Contrato roto.",
        requestId: "req_1",
      }),
    );

    expect(events[0]).toMatchObject({
      status: 0,
      code: "API_CONTRACT_ERROR",
      requestId: "req_1",
    });
  });

  it("redacta el contexto: no filtra tokens ni PII", () => {
    const events = capture();
    reportEvent("route_error", new Error("x"), {
      accessToken: "tok-secreto",
      email: "pii@example.invalid",
    });

    const serializado = JSON.stringify(events[0]);
    expect(serializado).not.toContain("tok-secreto");
    expect(serializado).not.toContain("pii@example.invalid");
  });

  it("redacta un Bearer que venga en el mensaje del error", () => {
    const events = capture();
    reportEvent("route_error", new Error("falló con Bearer abc.def-1"));

    expect(events[0].message).toBe("falló con Bearer [redactado]");
  });

  it("incluye el ambiente en el contexto base", () => {
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "staging");
    const events = capture();
    reportEvent("route_error", new Error("x"));

    expect(events[0].context.environment).toBe("staging");
  });

  it("no lanza si el sink falla (best-effort)", () => {
    setObservabilitySink(() => {
      throw new Error("sink caído");
    });
    expect(() => reportEvent("route_error", new Error("x"))).not.toThrow();
  });

  it("con sink en null (no-op) tampoco lanza", () => {
    setObservabilitySink(null);
    expect(() => reportEvent("web_vital", new Error("x"))).not.toThrow();
  });
});
