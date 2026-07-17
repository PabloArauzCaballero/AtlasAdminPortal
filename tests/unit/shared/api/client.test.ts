import { HttpResponse, delay, http } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";
import { apiRequest, resetLoginRedirectLock } from "@/shared/api/client";
import { isApiContractError } from "@/shared/api/contract";
import { isAtlasApiError } from "@/shared/api/errors";
import { resetRefreshCoordinator } from "@/shared/api/refresh-coordinator";
import {
  API_BASE,
  SESSION_STORAGE_KEY,
  server,
} from "../../../helpers/mock-server";
import { makeSession } from "../../../helpers/session-fixtures";

const THINGS_URL = `${API_BASE}/internal/things`;
const REFRESH_URL = `${API_BASE}/internal/auth/refresh`;

function seedStoredSession(accessToken = "token-viejo") {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(makeSession({ accessToken })),
  );
}

const originalLocation = Object.getOwnPropertyDescriptor(window, "location");

/**
 * Evita el "Not implemented: navigation" de jsdom en el redirect a login.
 * Debe restaurarse siempre: jsdom deriva el origen del documento de
 * `window.location`, y dejarlo pisado con un objeto plano deja `localStorage`
 * en undefined para el resto de los tests.
 */
function stubLocation(pathname = "/internal/things") {
  const replace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname, search: "", replace },
  });
  return replace;
}

function restoreLocation() {
  if (originalLocation) {
    Object.defineProperty(window, "location", originalLocation);
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  restoreLocation();
  window.sessionStorage.clear();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
  // Estado de módulo: sin esto, un test arrastraría el refresh en vuelo o el
  // lock de redirección del anterior.
  resetRefreshCoordinator();
  resetLoginRedirectLock();
});

describe("apiRequest", () => {
  it("devuelve los datos desenvolviendo el sobre { data }", async () => {
    server.use(
      http.get(THINGS_URL, () => HttpResponse.json({ data: { id: "t1" } })),
    );

    await expect(apiRequest("/internal/things")).resolves.toEqual({ id: "t1" });
  });

  it("envía el Authorization con el token de la sesión guardada", async () => {
    seedStoredSession("token-abc");
    let authHeader: string | null = null;
    server.use(
      http.get(THINGS_URL, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ data: {} });
      }),
    );

    await apiRequest("/internal/things");

    expect(authHeader).toBe("Bearer token-abc");
  });

  it("lanza AtlasApiError con code y requestId ante un 403", async () => {
    server.use(
      http.get(THINGS_URL, () =>
        HttpResponse.json(
          {
            error: { code: "FORBIDDEN", message: "No tienes permisos." },
            timestamp: "2026-07-16T12:00:00.000Z",
          },
          { status: 403, headers: { "x-request-id": "req_403" } },
        ),
      ),
    );

    const error = await apiRequest("/internal/things").catch((e: unknown) => e);

    expect(isAtlasApiError(error)).toBe(true);
    expect(error).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      requestId: "req_403",
    });
  });

  it("no intenta refrescar ante un 403 (solo el 401 refresca)", async () => {
    seedStoredSession();
    let refreshCalls = 0;
    server.use(
      http.get(THINGS_URL, () => new HttpResponse(null, { status: 403 })),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return HttpResponse.json({ data: makeSession() });
      }),
    );

    await apiRequest("/internal/things").catch(() => undefined);

    expect(refreshCalls).toBe(0);
  });

  describe("ciclo 401 -> refresh -> retry", () => {
    it("refresca y reintenta, devolviendo los datos del reintento", async () => {
      seedStoredSession();
      let refreshed = false;
      server.use(
        http.get(THINGS_URL, () =>
          refreshed
            ? HttpResponse.json({ data: { id: "t1" } })
            : new HttpResponse(null, { status: 401 }),
        ),
        http.post(REFRESH_URL, () => {
          refreshed = true;
          return HttpResponse.json({
            data: makeSession({ accessToken: "token-nuevo" }),
          });
        }),
      );

      await expect(apiRequest("/internal/things")).resolves.toEqual({
        id: "t1",
      });
    });

    it("reintenta con el token nuevo, no con el viejo", async () => {
      seedStoredSession("token-viejo");
      const tokensVistos: (string | null)[] = [];
      let refreshed = false;
      server.use(
        http.get(THINGS_URL, ({ request }) => {
          tokensVistos.push(request.headers.get("authorization"));
          return refreshed
            ? HttpResponse.json({ data: {} })
            : new HttpResponse(null, { status: 401 });
        }),
        http.post(REFRESH_URL, () => {
          refreshed = true;
          return HttpResponse.json({
            data: makeSession({ accessToken: "token-nuevo" }),
          });
        }),
      );

      await apiRequest("/internal/things");

      expect(tokensVistos).toEqual([
        "Bearer token-viejo",
        "Bearer token-nuevo",
      ]);
    });

    it("si el refresh falla, limpia la sesión y propaga el error", async () => {
      seedStoredSession();
      stubLocation();
      server.use(
        http.get(THINGS_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, () => new HttpResponse(null, { status: 401 })),
      );

      const error = await apiRequest("/internal/things").catch(
        (e: unknown) => e,
      );

      expect(isAtlasApiError(error)).toBe(true);
      expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it("no refresca si la petición pide skipRefresh", async () => {
      seedStoredSession();
      stubLocation();
      let refreshCalls = 0;
      server.use(
        http.get(THINGS_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, () => {
          refreshCalls += 1;
          return HttpResponse.json({ data: makeSession() });
        }),
      );

      await apiRequest("/internal/things", { skipRefresh: true }).catch(
        () => undefined,
      );

      expect(refreshCalls).toBe(0);
    });
  });

  describe("FASE 4 — coordinación de refresh concurrente (single-flight)", () => {
    it("con 10 peticiones que reciben 401 a la vez, dispara UN solo refresh", async () => {
      seedStoredSession();
      let refreshCalls = 0;
      let refreshed = false;

      server.use(
        http.get(THINGS_URL, () =>
          refreshed
            ? HttpResponse.json({ data: { id: "ok" } })
            : new HttpResponse(null, { status: 401 }),
        ),
        http.post(REFRESH_URL, async () => {
          refreshCalls += 1;
          // Latencia real: sin esto, cada refresh terminaría antes de que
          // arranque el siguiente y la carrera no se reproduciría.
          await delay(25);
          refreshed = true;
          return HttpResponse.json({
            data: makeSession({ accessToken: "token-nuevo" }),
          });
        }),
      );

      const results = await Promise.all(
        Array.from({ length: 10 }, () => apiRequest("/internal/things")),
      );

      expect(refreshCalls).toBe(1);
      expect(results).toHaveLength(10);
      expect(results[0]).toEqual({ id: "ok" });
    });

    it("permite un refresh nuevo después de que el anterior terminó", async () => {
      seedStoredSession();
      let refreshCalls = 0;
      let refreshed = false;
      server.use(
        http.get(THINGS_URL, () =>
          refreshed
            ? HttpResponse.json({ data: {} })
            : new HttpResponse(null, { status: 401 }),
        ),
        http.post(REFRESH_URL, () => {
          refreshCalls += 1;
          refreshed = true;
          return HttpResponse.json({ data: makeSession() });
        }),
      );

      await apiRequest("/internal/things");
      refreshed = false; // la sesión vuelve a caducar más tarde
      await apiRequest("/internal/things");

      expect(refreshCalls).toBe(2);
    });

    it("con varios 401 y refresh fallido, redirige a login una sola vez", async () => {
      seedStoredSession();
      const replace = stubLocation();
      server.use(
        http.get(THINGS_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, async () => {
          await delay(10);
          return new HttpResponse(null, { status: 401 });
        }),
      );

      await Promise.all(
        Array.from({ length: 5 }, () =>
          apiRequest("/internal/things").catch(() => undefined),
        ),
      );

      expect(replace).toHaveBeenCalledTimes(1);
    });

    it("todas las peticiones concurrentes se resuelven tras el refresh compartido", async () => {
      seedStoredSession();
      let refreshed = false;
      server.use(
        http.get(THINGS_URL, () =>
          refreshed
            ? HttpResponse.json({ data: { id: "ok" } })
            : new HttpResponse(null, { status: 401 }),
        ),
        http.post(REFRESH_URL, async () => {
          await delay(25);
          refreshed = true;
          return HttpResponse.json({ data: makeSession() });
        }),
      );

      const results = await Promise.all(
        Array.from({ length: 5 }, () => apiRequest("/internal/things")),
      );

      expect(results.every((r) => JSON.stringify(r) === '{"id":"ok"}')).toBe(
        true,
      );
    });
  });

  describe("validación de contrato (FASE 7)", () => {
    const thingSchema = z.object({ id: z.string(), name: z.string() });

    it("devuelve los datos cuando cumplen el esquema", async () => {
      server.use(
        http.get(THINGS_URL, () =>
          HttpResponse.json({ data: { id: "t1", name: "Cosa" } }),
        ),
      );

      await expect(
        apiRequest("/internal/things", { schema: thingSchema }),
      ).resolves.toEqual({ id: "t1", name: "Cosa" });
    });

    it("lanza ApiContractError cuando la forma no coincide", async () => {
      server.use(
        http.get(THINGS_URL, () =>
          HttpResponse.json(
            { data: { id: "t1" } },
            { headers: { "x-request-id": "req_contract" } },
          ),
        ),
      );

      const error = await apiRequest("/internal/things", {
        schema: thingSchema,
      }).catch((e: unknown) => e);

      expect(isApiContractError(error)).toBe(true);
      expect(error).toMatchObject({
        code: "API_CONTRACT_ERROR",
        endpoint: "/internal/things",
        requestId: "req_contract",
      });
    });

    it("sin schema no valida nada (retrocompatibilidad)", async () => {
      server.use(
        http.get(THINGS_URL, () => HttpResponse.json({ data: { raro: true } })),
      );

      await expect(apiRequest("/internal/things")).resolves.toEqual({
        raro: true,
      });
    });
  });
});
