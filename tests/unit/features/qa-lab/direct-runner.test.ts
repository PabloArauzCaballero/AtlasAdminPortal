import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import { executeEndpointDirectly } from "@/features/qa-lab/direct-runner";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import {
  endpointFixture,
  EVIL_HOST_URL,
  fetchCallsContain,
  jsonResponse,
  REAL_ACCESS_TOKEN,
  REAL_CSRF_TOKEN,
  runInputFixture,
  sessionFixture,
  stubQaEnv,
} from "./qa-fixtures";

const mockedGetSession = vi.mocked(getStoredInternalSession);
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubQaEnv();
  mockedGetSession.mockReturnValue(sessionFixture());
  fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("executeEndpointDirectly · allowlist de host", () => {
  it("no dispara ningún fetch cuando el host manual no está en la allowlist", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("allowlist");
  });

  it("no filtra el token de sesión al bloquear: el preview del request va redactado", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
    );

    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("bloquea también el dry-run contra un host ajeno (el preview no debe llevar credenciales)", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        dryRun: true,
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("allowlist");
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("bloquea un routeOverride absoluto hacia un host ajeno antes del fetch", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({ routeOverride: `${EVIL_HOST_URL}/collect` }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("allowlist");
  });

  it("bloquea el host ajeno disfrazado de userinfo (https://api.atlas.internal@evil…)", async () => {
    // Confusión clásica de parsing: lo que va antes de la @ es usuario, no host.
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        routeOverride: "https://api.atlas.internal@evil.example.com/collect",
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("allowlist");
  });

  it("ningún argumento de fetch contiene el token cuando el host está bloqueado", async () => {
    await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
    );

    expect(fetchCallsContain(fetchMock, REAL_ACCESS_TOKEN)).toBe(false);
    expect(fetchCallsContain(fetchMock, REAL_CSRF_TOKEN)).toBe(false);
  });

  it("ejecuta contra un host manual sí declarado en la allowlist", async () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");

    await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: "https://qa-sandbox.atlas.internal",
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("qa-sandbox.atlas.internal");
  });
});

describe("executeEndpointDirectly · request enviado", () => {
  it("envía el token de sesión a la base propia del portal", async () => {
    await executeEndpointDirectly(endpointFixture(), runInputFixture());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.atlas.internal/api/v1/internal/users");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${REAL_ACCESS_TOKEN}`,
    );
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("un GET no lleva cuerpo", async () => {
    await executeEndpointDirectly(endpointFixture(), runInputFixture());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("un POST autorizado serializa el payload como JSON", async () => {
    await executeEndpointDirectly(
      endpointFixture({ method: "POST", isReadonly: false }),
      runInputFixture({ allowMutations: true, payload: { name: "atlas" } }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ name: "atlas" }));
  });
});

describe("executeEndpointDirectly · respuestas del backend", () => {
  it("reporta el status de un 500 sin tratarlo como error de red", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "boom" }, { status: 500 }),
    );

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.httpStatus).toBe(500);
    expect(result.ok).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("acepta un 204 con cuerpo vacío sin romper el parseo", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.httpStatus).toBe(204);
    expect(result.responseBody).toBeNull();
    expect(result.responseSizeBytes).toBe(0);
  });

  it("devuelve el cuerpo tal cual cuando no es JSON válido", async () => {
    fetchMock.mockResolvedValue(new Response("no-soy-json", { status: 200 }));

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.responseBody).toBe("no-soy-json");
  });

  it("propaga el error de red como error del resultado, no como excepción", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.error).toContain("Failed to fetch");
    expect(result.httpStatus).toBeUndefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("traduce un abort por timeout a un error legible", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.error).toContain("Timeout");
  });

  it("expone el request id que devuelve el backend", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({}, { headers: { "x-request-id": "req-42" } }),
    );

    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.responseRequestId).toBe("req-42");
  });

  it("redacta el Authorization en los headers del request que devuelve al UI", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.requestHeaders?.Authorization).not.toContain(
      REAL_ACCESS_TOKEN,
    );
    expect(result.requestHeaders?.Authorization).toContain("[redacted]");
  });
});

describe("executeEndpointDirectly · puertas de seguridad operativa", () => {
  it("bloquea la ejecución real de un endpoint mutante sin permitir mutaciones", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture({ method: "DELETE", isReadonly: false }),
      runInputFixture({ allowMutations: false }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("permitir mutación real");
  });

  it("bloquea cualquier ejecución real contra producción readonly", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({ environment: "PRODUCTION_READONLY", dryRun: false }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("readonly");
  });

  it("permite el dry-run contra producción readonly, sin fetch", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture({ environment: "PRODUCTION_READONLY", dryRun: true }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("bloquea un endpoint testEnvironmentOnly fuera de LOCAL", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture({ testEnvironmentOnly: true }),
      runInputFixture({ environment: "STAGING" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("local/testing");
  });

  it("no ejecuta si faltan path params: avisa en vez de pegarle a una URL con ':id'", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture({ fullPath: "/internal/users/:userId" }),
      runInputFixture({ pathParams: {} }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("userId");
    expect(result.warnings?.[0]).toContain("userId");
  });

  it("sustituye el path param cuando sí viene y ejecuta", async () => {
    await executeEndpointDirectly(
      endpointFixture({ fullPath: "/internal/users/:userId" }),
      runInputFixture({ pathParams: { userId: "u-7" } }),
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.atlas.internal/api/v1/internal/users/u-7",
    );
  });
});

describe("executeEndpointDirectly · log pino", () => {
  it("adjunta el log de la corrida con nombre de fichero y líneas", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.pinoLogFileName).toMatch(/^\.logs\/qa-direct-ep-1-/);
    expect(result.pinoLogLines?.length).toBeGreaterThan(0);
  });

  it("el log de la corrida nunca contiene el token de sesión en claro", async () => {
    const result = await executeEndpointDirectly(
      endpointFixture(),
      runInputFixture(),
    );

    expect(result.pinoLogLines?.join("\n")).not.toContain(REAL_ACCESS_TOKEN);
  });
});
