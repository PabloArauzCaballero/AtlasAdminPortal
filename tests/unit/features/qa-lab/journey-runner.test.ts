import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import type { EndpointItem } from "@/features/systems/types";
import { runJourney } from "@/features/qa-lab/journey-runner";
import type {
  QaJourneyConfig,
  QaJourneyStepSpec,
} from "@/features/qa-lab/journey-types";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import {
  endpointFixture,
  EVIL_HOST_URL,
  fetchCallsContain,
  jsonResponder,
  REAL_ACCESS_TOKEN,
  sessionFixture,
  stubQaEnv,
} from "./qa-fixtures";

const mockedGetSession = vi.mocked(getStoredInternalSession);
let fetchMock: ReturnType<typeof vi.fn>;

function configFixture(
  overrides: Partial<QaJourneyConfig> = {},
): QaJourneyConfig {
  return {
    environment: "LOCAL",
    baseRouteKey: "CONFIGURED_API",
    dryRun: false,
    timeoutMs: 5_000,
    authMode: "session",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    ...overrides,
  } as QaJourneyConfig;
}

function stepFixture(overrides: Partial<QaJourneyStepSpec> = {}) {
  return {
    key: "login",
    endpointId: "ep-1",
    ...overrides,
  } as QaJourneyStepSpec;
}

function catalog(...endpoints: EndpointItem[]): Map<string, EndpointItem> {
  return new Map(
    endpoints.map((endpoint) => [String(endpoint.endpointId), endpoint]),
  );
}

beforeEach(() => {
  stubQaEnv();
  mockedGetSession.mockReturnValue(sessionFixture());
  fetchMock = vi.fn(jsonResponder({ id: "u-9" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("runJourney · allowlist heredada del direct-runner", () => {
  it("no dispara fetch si el journey apunta a un host manual no confiable", async () => {
    const result = await runJourney(
      [stepFixture()],
      configFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
      catalog(endpointFixture()),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.steps[0].passed).toBe(false);
    expect(result.steps[0].error).toContain("allowlist");
  });

  it("un journey bloqueado no filtra el token por ningún canal del fetch", async () => {
    await runJourney(
      [stepFixture()],
      configFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
      catalog(endpointFixture()),
    );

    expect(fetchCallsContain(fetchMock, REAL_ACCESS_TOKEN)).toBe(false);
  });

  it("un valor extraído de un paso previo no puede redirigir el paso siguiente a otro host", async () => {
    // El contexto lo llena el backend: si un `routeOverride` pudiera venir de ahí,
    // un backend comprometido reapuntaría el journey. El host se valida igual.
    fetchMock.mockImplementation(jsonResponder({ next: EVIL_HOST_URL }));

    const result = await runJourney(
      [
        stepFixture({ key: "first", extract: { target: "next" } }),
        stepFixture({
          key: "second",
          headers: { "x-target": "{{target}}" },
        }),
      ],
      configFixture(),
      catalog(endpointFixture()),
    );

    // El `every` sobre una lista vacía sería cierto por vacuidad: se fija el
    // número de llamadas para que la aserción no pueda pasar por no ejecutarse.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(
      urls.every((url) => url.startsWith("https://api.atlas.internal")),
    ).toBe(true);
    expect(result.steps[1].passed).toBe(true);
  });
});

describe("runJourney · encadenado de pasos", () => {
  it("salta un paso cuyo endpoint no está en el catálogo, sin abortar el journey", async () => {
    const result = await runJourney(
      [stepFixture({ key: "fantasma", endpointId: "ep-999" }), stepFixture()],
      configFixture(),
      catalog(endpointFixture()),
    );

    expect(result.steps[0].skipped).toContain("ep-999");
    expect(result.steps[0].passed).toBe(false);
    expect(result.totalSteps).toBe(2);
    expect(result.failedSteps).toBe(1);
    expect(result.passedSteps).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("extrae un valor de la respuesta y lo sustituye en el paso siguiente", async () => {
    fetchMock
      .mockImplementationOnce(jsonResponder({ data: { userId: "u-42" } }))
      .mockImplementation(jsonResponder({ ok: true }));

    const result = await runJourney(
      [
        stepFixture({
          key: "crear",
          endpointId: "ep-1",
          extract: { userId: "data.userId" },
        }),
        stepFixture({
          key: "leer",
          endpointId: "ep-2",
          pathParams: { userId: "{{userId}}" },
        }),
      ],
      configFixture(),
      catalog(
        endpointFixture(),
        endpointFixture({
          endpointId: "ep-2",
          fullPath: "/internal/users/:userId",
        }),
      ),
    );

    expect(result.context.userId).toBe("u-42");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.atlas.internal/api/v1/internal/users/u-42",
    );
    expect(result.steps[0].extracted).toEqual({ userId: "u-42" });
  });

  it("deja el placeholder intacto si la variable no existe en el contexto", async () => {
    const result = await runJourney(
      [stepFixture({ queryParams: { q: "{{noExiste}}" } })],
      configFixture(),
      catalog(endpointFixture()),
    );

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "q=%7B%7BnoExiste%7D%7D",
    );
    expect(result.steps[0].url).toContain("q=");
  });

  it("no extrae nada en dry-run: no hay respuesta real de la que extraer", async () => {
    const result = await runJourney(
      [stepFixture({ extract: { userId: "data.userId" } })],
      configFixture({ dryRun: true }),
      catalog(endpointFixture()),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.context).toEqual({});
    expect(result.steps[0].passed).toBe(true);
  });

  it("marca fallido un paso cuyo backend responde 500 y sigue con el resto", async () => {
    fetchMock
      .mockImplementationOnce(
        jsonResponder({ message: "boom" }, { status: 500 }),
      )
      .mockImplementation(jsonResponder({ ok: true }));

    const result = await runJourney(
      [stepFixture({ key: "a" }), stepFixture({ key: "b" })],
      configFixture(),
      catalog(endpointFixture()),
    );

    expect(result.steps[0].passed).toBe(false);
    expect(result.steps[0].httpStatus).toBe(500);
    expect(result.steps[1].passed).toBe(true);
    expect(result.passedSteps).toBe(1);
    expect(result.failedSteps).toBe(1);
  });

  it("sustituye placeholders anidados dentro del payload", async () => {
    fetchMock
      .mockImplementationOnce(jsonResponder({ ref: "r-1" }))
      .mockImplementation(jsonResponder({ ok: true }));

    await runJourney(
      [
        stepFixture({ key: "a", extract: { ref: "ref" } }),
        stepFixture({
          key: "b",
          allowMutations: true,
          payload: { wrap: { list: ["{{ref}}"] } },
        }),
      ],
      configFixture(),
      catalog(endpointFixture({ method: "POST", isReadonly: false })),
    );

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ wrap: { list: ["r-1"] } }));
  });

  it("un campo sensible de la respuesta llega ya redactado al contexto, no en claro", async () => {
    // Comportamiento actual y deseable: `sanitizeQaValue` redacta antes de que
    // `extractValues` mire el cuerpo, así que un journey no puede encadenar un
    // `accessToken` devuelto por un login. Se fija aquí para que no se relaje
    // sin querer al tocar el sanitizador.
    fetchMock.mockImplementation(
      jsonResponder({ accessToken: "secreto-real" }),
    );

    const result = await runJourney(
      [stepFixture({ extract: { captured: "accessToken" } })],
      configFixture(),
      catalog(endpointFixture()),
    );

    expect(result.context.captured).toBe("[redacted]");
    expect(JSON.stringify(result)).not.toContain("secreto-real");
  });

  it("reporta las marcas de tiempo y el conteo total del journey", async () => {
    const result = await runJourney(
      [stepFixture()],
      configFixture(),
      catalog(endpointFixture()),
    );

    expect(Date.parse(result.startedAt)).not.toBeNaN();
    expect(Date.parse(result.finishedAt)).toBeGreaterThanOrEqual(
      Date.parse(result.startedAt),
    );
    expect(result.totalSteps).toBe(1);
  });
});
