import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import { executeEndpointDirectly } from "@/features/qa-lab/direct-runner";
import {
  defaultQaEnvironment,
  getQaEnvironmentBaseUrl,
  isProductionTarget,
} from "@/features/qa-lab/environment";
import { buildQaRequest } from "@/features/qa-lab/request-builder";
import {
  credentialsForAuthMode,
  isHostAllowed,
} from "@/features/qa-lab/qa-safety";
import { runStressBurst } from "@/features/qa-lab/stress-runner";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import {
  endpointFixture,
  jsonResponse,
  runInputFixture,
  sessionFixture,
  stressInputFixture,
  stubQaEnv,
} from "./qa-fixtures";

const mockedGetSession = vi.mocked(getStoredInternalSession);
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubQaEnv();
  mockedGetSession.mockReturnValue(sessionFixture());
  fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("base relativa del portal (`/api/v1`)", () => {
  it("la ruta por defecto es la API de este portal, resuelta contra su origen", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api/v1");
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/api/v1/health" }),
      runInputFixture({ environment: "LOCAL", baseRouteKey: "CONFIGURED_API" }),
    );
    expect(built.url).toBe(`${window.location.origin}/api/v1/health`);
    expect(built.hostAllowed).toBe(true);
    expect(isHostAllowed(built.url)).toBe(true);
  });

  it("con la base relativa la petición sale, no lanza «Invalid URL»", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api/v1");
    const result = await executeEndpointDirectly(
      endpointFixture({ fullPath: "/api/v1/health" }),
      runInputFixture({ environment: "LOCAL", baseRouteKey: "CONFIGURED_API" }),
    );
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("STAGING sin base propia cae a la del portal", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api/v1");
    expect(getQaEnvironmentBaseUrl("STAGING")).toBe("/api/v1");
  });

  it("el ambiente sale del despliegue: producción queda en sólo lectura", () => {
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "vps-testing");
    expect(defaultQaEnvironment()).toBe("LOCAL");
    expect(isProductionTarget(defaultQaEnvironment())).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "production");
    expect(defaultQaEnvironment()).toBe("PRODUCTION_READONLY");
    expect(isProductionTarget(defaultQaEnvironment())).toBe(true);
  });
});

describe("credenciales del navegador según la credencial elegida", () => {
  it.each([
    ["session", "include"],
    ["none", "omit"],
    ["invalid", "omit"],
    ["custom", "omit"],
  ])("%s → credentials %s", (mode, expected) => {
    expect(credentialsForAuthMode(mode)).toBe(expected);
  });

  it("«Sin identificarse» no manda la cookie (credentials: omit) ni Authorization", async () => {
    await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({ authMode: "none" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(
      (init.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("con tu sesión sí viaja la cookie", async () => {
    await executeEndpointDirectly(endpointFixture(), runInputFixture());
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe(
      "include",
    );
  });

  it("«Token de otro actor» sin token se bloquea antes de enviar", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({ authMode: "custom", customAuthToken: "  " }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("no pegaste ningún token");
  });

  it("la carga también omite la cookie con «Credencial falsa»", async () => {
    await runStressBurst(
      endpointFixture(),
      stressInputFixture({ authMode: "invalid" }),
    );
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).credentials).toBe("omit");
    }
  });
});

describe("carga · una clave anti-duplicados y un cuerpo por petición", () => {
  const post = endpointFixture({ method: "POST" });

  it("cada petición lleva su propia x-idempotency-key", async () => {
    await runStressBurst(
      post,
      stressInputFixture({ allowMutations: true, maxRequests: 3 }),
    );
    const keys = fetchMock.mock.calls.map(
      ([, init]) =>
        ((init as RequestInit).headers as Record<string, string>)[
          "x-idempotency-key"
        ],
    );
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });

  it("con un lote rotativo, cada petición lleva la siguiente persona", async () => {
    await runStressBurst(
      post,
      stressInputFixture({
        allowMutations: true,
        maxRequests: 3,
        concurrency: 1,
        payloadRotation: [{ email: "a@qa" }, { email: "b@qa" }],
      }),
    );
    const bodies = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).body,
    );
    expect(bodies).toEqual([
      JSON.stringify({ email: "a@qa" }),
      JSON.stringify({ email: "b@qa" }),
      JSON.stringify({ email: "a@qa" }),
    ]);
  });
});
