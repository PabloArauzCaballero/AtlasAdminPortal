import { vi } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import type { InternalSession } from "@/shared/auth/types";
import type {
  EndpointRunInput,
  EndpointStressRunInput,
} from "@/features/qa-lab/types";
import { endpointFixture as catalogEndpointFixture } from "./endpoint-fixture";

/**
 * Fixtures compartidas por los tests de los runners del QA Lab.
 *
 * El token vive aquí y no en cada test para poder afirmar, de forma uniforme,
 * que NINGÚN argumento pasado a `fetch` lo contiene (ver `fetchCallsContain`).
 */
export const PORTAL_API_BASE_URL = "https://api.atlas.internal/api/v1";
export const REAL_ACCESS_TOKEN = "real-session-token-do-not-leak";
export const REAL_CSRF_TOKEN = "real-csrf-token-do-not-leak";
export const EVIL_HOST_URL = "https://evil.example.com";

export function sessionFixture(): InternalSession {
  return {
    accessToken: REAL_ACCESS_TOKEN,
    csrfToken: REAL_CSRF_TOKEN,
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
  } as unknown as InternalSession;
}

/**
 * Endpoint del catálogo apuntando a una ruta del portal. Reutiliza el fixture
 * tipado de `endpoint-fixture.ts` y solo cambia la ruta: los runners componen la
 * URL a partir de `fullPath`, y `/internal/users` es más representativo que el
 * `/health` por defecto para lo que prueban estos tests.
 */
export function endpointFixture(
  overrides: Partial<EndpointItem> = {},
): EndpointItem {
  return catalogEndpointFixture({
    code: "USERS_LIST",
    routePath: "/internal/users",
    fullPath: "/internal/users",
    ...overrides,
  });
}

export function runInputFixture(
  overrides: Partial<EndpointRunInput> = {},
): EndpointRunInput {
  return {
    environment: "LOCAL",
    baseRouteKey: "CONFIGURED_API",
    dryRun: false,
    timeoutMs: 5_000,
    allowMutations: false,
    authMode: "session",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    payload: {},
    queryParams: {},
    pathParams: {},
    headers: {},
    expectedResponse: { statusCodes: [200], headers: {} },
    ...overrides,
  };
}

export function stressInputFixture(
  overrides: Partial<EndpointStressRunInput> = {},
): EndpointStressRunInput {
  return {
    environment: "LOCAL",
    baseRouteKey: "CONFIGURED_API",
    dryRun: false,
    targetRps: 100,
    durationSeconds: 1,
    concurrency: 2,
    rampUpSeconds: 0,
    maxRequests: 3,
    timeoutMs: 5_000,
    approvalTicket: "OPS-12345",
    allowMutations: false,
    authMode: "session",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    payload: {},
    queryParams: {},
    pathParams: {},
    headers: {},
    expectedResponse: { statusCodes: [200], headers: {} },
    ...overrides,
  };
}

/** Entorno determinista: sin esto las bases dependerían de .env.local. */
export function stubQaEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", PORTAL_API_BASE_URL);
  vi.stubEnv("NEXT_PUBLIC_STAGING_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_PROD_READONLY_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "");
  vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "x-csrf-token");
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/**
 * El cuerpo de una `Response` solo se puede consumir una vez: reutilizar la
 * misma instancia entre llamadas hace fallar la segunda con "body disturbed".
 * Por eso los stubs de fetch devuelven siempre una respuesta nueva.
 */
export function jsonResponder(
  body: unknown,
  init: ResponseInit = {},
): () => Promise<Response> {
  return async () => jsonResponse(body, init);
}

/**
 * Serializa TODO lo que se pasó a `fetch` (url, headers, body) y busca la aguja.
 * Es la red de seguridad contra fugas por un canal que no se anticipó: da igual
 * si el token viaja en `Authorization`, en un header custom o en el query string.
 */
export function fetchCallsContain(
  fetchMock: ReturnType<typeof vi.fn>,
  needle: string,
): boolean {
  return fetchMock.mock.calls.some((call) =>
    JSON.stringify(call).includes(needle),
  );
}
