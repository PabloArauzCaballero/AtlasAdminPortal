import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import type { InternalSession } from "@/shared/auth/types";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import { buildQaRequest } from "@/features/qa-lab/request-builder";
import { getStoredInternalSession } from "@/shared/auth/session-storage";

const PORTAL_API_BASE_URL = "https://api.atlas.internal/api/v1";
const REAL_ACCESS_TOKEN = "real-session-token-do-not-leak";

const mockedGetSession = vi.mocked(getStoredInternalSession);

function sessionFixture(): InternalSession {
  return {
    accessToken: REAL_ACCESS_TOKEN,
    csrfToken: "real-csrf-token",
    tokenType: "Bearer",
    user: {
      id: "1",
      tenantId: "demo",
      email: "qa@atlas.internal",
      fullName: "QA Operator",
      status: "ACTIVE",
      roles: [],
      permissions: [],
    },
  };
}

function endpointFixture(overrides: Partial<EndpointItem> = {}): EndpointItem {
  return {
    endpointId: "ep-1",
    code: "USERS_LIST",
    method: "GET",
    routePath: "/internal/users",
    fullPath: "/internal/users",
    ...overrides,
  } as unknown as EndpointItem;
}

function inputFixture(overrides: Record<string, unknown> = {}) {
  return {
    environment: "LOCAL",
    pathParams: {},
    queryParams: {},
    headers: {},
    ...overrides,
  } as Parameters<typeof buildQaRequest>[1];
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", PORTAL_API_BASE_URL);
  vi.stubEnv("NEXT_PUBLIC_STAGING_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_PROD_READONLY_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "");
  vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "x-csrf-token");
  mockedGetSession.mockReturnValue(sessionFixture());
});

describe("buildQaRequest · credenciales de sesión", () => {
  it("adjunta el token real cuando el destino es la base del portal", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ baseRouteKey: "CONFIGURED_API" }),
    );

    expect(built.hostAllowed).toBe(true);
    expect(built.headers.Authorization).toBe(`Bearer ${REAL_ACCESS_TOKEN}`);
  });

  it("NO adjunta el token real a un host manual fuera de la allowlist", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: "https://evil.example.com",
      }),
    );

    expect(built.hostAllowed).toBe(false);
    expect(built.headers.Authorization).toBeUndefined();
    expect(JSON.stringify(built.headers)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("NO adjunta el token real vía routeOverride absoluto a un host ajeno", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ routeOverride: "https://evil.example.com/collect" }),
    );

    expect(built.hostAllowed).toBe(false);
    expect(built.headers.Authorization).toBeUndefined();
  });

  it("adjunta el token a un host manual sí declarado en la allowlist", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: "https://qa-sandbox.atlas.internal",
      }),
    );

    expect(built.hostAllowed).toBe(true);
    expect(built.headers.Authorization).toBe(`Bearer ${REAL_ACCESS_TOKEN}`);
  });

  it("NO filtra el token CSRF de sesión a un host no confiable", () => {
    const built = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: "https://evil.example.com",
      }),
    );

    expect(built.headers["x-csrf-token"]).toBeUndefined();
  });

  it("sigue enviando el CSRF de sesión a un host confiable", () => {
    const built = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture({ baseRouteKey: "CONFIGURED_API" }),
    );

    expect(built.headers["x-csrf-token"]).toBe("real-csrf-token");
  });
});

describe("buildQaRequest · modos de auth explícitos", () => {
  it("respeta authMode none en host confiable", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ baseRouteKey: "CONFIGURED_API", authMode: "none" }),
    );

    expect(built.headers.Authorization).toBeUndefined();
  });

  it("el token inválido de prueba no es el de sesión", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ baseRouteKey: "CONFIGURED_API", authMode: "invalid" }),
    );

    expect(built.headers.Authorization).toContain("qa-invalid-token");
    expect(built.headers.Authorization).not.toContain(REAL_ACCESS_TOKEN);
  });
});
