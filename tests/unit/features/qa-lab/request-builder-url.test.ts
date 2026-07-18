import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import {
  buildQaRequest,
  effectiveTimeoutMs,
  getBodyForMethod,
} from "@/features/qa-lab/request-builder";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import { endpointFixture, sessionFixture, stubQaEnv } from "./qa-fixtures";

const mockedGetSession = vi.mocked(getStoredInternalSession);

function inputFixture(overrides: Record<string, unknown> = {}) {
  return {
    environment: "LOCAL",
    baseRouteKey: "CONFIGURED_API",
    pathParams: {},
    queryParams: {},
    headers: {},
    ...overrides,
  } as Parameters<typeof buildQaRequest>[1];
}

beforeEach(() => {
  stubQaEnv();
  mockedGetSession.mockReturnValue(sessionFixture());
});

describe("buildQaRequest · composición de la URL", () => {
  it("no duplica /api/v1 cuando la base ya lo trae y el path también", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/api/v1/internal/users" }),
      inputFixture(),
    );

    expect(built.url).toBe("https://api.atlas.internal/api/v1/internal/users");
  });

  it("añade /api/v1 cuando ni la base ni el path lo traen", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ baseRouteKey: "LOCAL_ROOT" }),
    );

    expect(built.url).toBe("http://localhost:3005/api/v1/internal/users");
  });

  it("respeta un path sin barra inicial", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "internal/users" }),
      inputFixture(),
    );

    expect(built.url).toBe("https://api.atlas.internal/api/v1/internal/users");
  });

  it("cae al routePath cuando el endpoint no trae fullPath", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: undefined, routePath: "/internal/roles" }),
      inputFixture(),
    );

    expect(built.url).toContain("/internal/roles");
  });

  it("sustituye path params en formato {llave} además de :llave", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/internal/users/{userId}/roles" }),
      inputFixture({ pathParams: { userId: "u-1" } }),
    );

    expect(built.url).toContain("/internal/users/u-1/roles");
    expect(built.unresolvedPathParams).toEqual([]);
  });

  it("escapa un path param con caracteres especiales en vez de romper la ruta", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/internal/users/:userId" }),
      inputFixture({ pathParams: { userId: "a/../admin" } }),
    );

    expect(built.url).toContain("a%2F..%2Fadmin");
  });

  it("reporta como pendiente un path param vacío, no lo trata como resuelto", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/internal/users/:userId" }),
      inputFixture({ pathParams: { userId: "" } }),
    );

    expect(built.unresolvedPathParams).toEqual(["userId"]);
  });

  it("no repite un path param que aparece dos veces en la lista de pendientes", () => {
    const built = buildQaRequest(
      endpointFixture({ fullPath: "/a/:id/b/:id" }),
      inputFixture(),
    );

    expect(built.unresolvedPathParams).toEqual(["id"]);
  });
});

describe("buildQaRequest · query params", () => {
  it("omite valores vacíos, null y undefined en vez de mandar 'q='", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({
        queryParams: { a: "", b: null, c: undefined, d: "ok" },
      }),
    );

    expect(built.url).toContain("d=ok");
    expect(built.url).not.toContain("a=");
    expect(built.url).not.toContain("b=");
  });

  it("expande un array en un parámetro repetido", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ queryParams: { status: ["ACTIVE", "LOCKED"] } }),
    );

    expect(built.url).toContain("status=ACTIVE");
    expect(built.url).toContain("status=LOCKED");
  });

  it("serializa un objeto como JSON en el query string", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ queryParams: { filter: { role: "admin" } } }),
    );

    expect(decodeURIComponent(built.url)).toContain('filter={"role":"admin"}');
  });

  it("conserva los query params de un routeOverride absoluto permitido", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({
        routeOverride: "https://qa-sandbox.atlas.internal/ping?a=1",
        queryParams: { b: "2" },
      }),
    );

    expect(built.url).toContain("a=1");
    expect(built.url).toContain("b=2");
    expect(built.hostAllowed).toBe(true);
  });
});

describe("buildQaRequest · cabeceras", () => {
  it("descarta cabeceras custom que el operador no puede fijar (Host, Origin…)", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({
        headers: {
          Host: "evil.example.com",
          Origin: "https://evil.example.com",
          "x-mio": "1",
        },
      }),
    );

    expect(built.headers.Host).toBeUndefined();
    expect(built.headers.Origin).toBeUndefined();
    expect(built.headers["x-mio"]).toBe("1");
  });

  it("incluye el tenant de la sesión salvo que se desactive", () => {
    expect(
      buildQaRequest(endpointFixture(), inputFixture()).headers["x-tenant-id"],
    ).toBe("demo");
    expect(
      buildQaRequest(
        endpointFixture(),
        inputFixture({ includeTenantHeader: false }),
      ).headers["x-tenant-id"],
    ).toBeUndefined();
  });

  it("añade clave de idempotencia solo a métodos mutantes", () => {
    const get = buildQaRequest(endpointFixture(), inputFixture());
    const post = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture(),
    );

    expect(get.headers["x-idempotency-key"]).toBeUndefined();
    expect(post.headers["x-idempotency-key"]).toMatch(/^qa-lab-/);
  });

  it("no añade clave de idempotencia si el operador la desactiva", () => {
    const built = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture({ includeIdempotencyKey: false }),
    );

    expect(built.headers["x-idempotency-key"]).toBeUndefined();
  });

  it("genera una clave de idempotencia distinta por request", () => {
    const first = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture(),
    ).headers["x-idempotency-key"];
    const second = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture(),
    ).headers["x-idempotency-key"];

    expect(first).not.toBe(second);
  });

  it("no manda CSRF si authMode es none, aunque el host sea confiable", () => {
    const built = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture({ authMode: "none" }),
    );

    expect(built.headers["x-csrf-token"]).toBeUndefined();
  });

  it("no manda CSRF en un GET: no hay nada que proteger", () => {
    const built = buildQaRequest(endpointFixture(), inputFixture());

    expect(built.headers["x-csrf-token"]).toBeUndefined();
  });

  it("no manda CSRF si el portal no tiene configurado el nombre de la cabecera", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "");
    const built = buildQaRequest(
      endpointFixture({ method: "POST" }),
      inputFixture(),
    );

    expect(built.headers["x-csrf-token"]).toBeUndefined();
  });

  it("authMode custom usa el token escrito por el operador, recortado", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ authMode: "custom", customAuthToken: "  mi-token  " }),
    );

    expect(built.headers.Authorization).toBe("Bearer mi-token");
  });

  it("authMode custom con token en blanco cae a la sesión, no manda 'Bearer '", () => {
    const built = buildQaRequest(
      endpointFixture(),
      inputFixture({ authMode: "custom", customAuthToken: "   " }),
    );

    expect(built.headers.Authorization).not.toBe("Bearer ");
    expect(built.headers.Authorization).toContain("Bearer ");
  });

  it("sin sesión guardada no inventa un Authorization", () => {
    mockedGetSession.mockReturnValue(null);
    const built = buildQaRequest(endpointFixture(), inputFixture());

    expect(built.headers.Authorization).toBeUndefined();
    expect(built.headers["x-tenant-id"]).toBeUndefined();
  });
});

describe("getBodyForMethod", () => {
  it("no manda cuerpo en métodos no mutantes", () => {
    expect(getBodyForMethod("GET", { a: 1 })).toBeUndefined();
    expect(getBodyForMethod("HEAD", { a: 1 })).toBeUndefined();
    expect(getBodyForMethod("OPTIONS", { a: 1 })).toBeUndefined();
  });

  it("serializa el payload en métodos mutantes", () => {
    expect(getBodyForMethod("POST", { a: 1 })).toBe('{"a":1}');
    expect(getBodyForMethod("PATCH", { a: 1 })).toBe('{"a":1}');
  });

  it("un payload nulo se manda como objeto vacío, no como 'null'", () => {
    expect(
      getBodyForMethod("POST", null as unknown as Record<string, unknown>),
    ).toBe("{}");
  });
});

describe("effectiveTimeoutMs", () => {
  it("cae al timeout del portal si el valor es absurdo o ausente", () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "9000");
    expect(effectiveTimeoutMs(undefined)).toBe(9_000);
    expect(effectiveTimeoutMs(10)).toBe(9_000);
    expect(effectiveTimeoutMs(Number.NaN)).toBe(9_000);
  });

  it("respeta un timeout válido del operador", () => {
    expect(effectiveTimeoutMs(30_000)).toBe(30_000);
  });

  it("recorta al techo de 120 s para que un QA no cuelgue la pestaña", () => {
    expect(effectiveTimeoutMs(999_999)).toBe(120_000);
  });
});
