import { HttpResponse, http } from "msw";
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
import { apiRequest, resetLoginRedirectLock } from "@/shared/api/client";
import { AtlasApiError } from "@/shared/api/errors";
import {
  delayBeforeAttempt,
  deservesRetry,
  isGatewayResponse,
  retryModeFor,
} from "@/shared/api/gateway-retry";
import { resetRefreshCoordinator } from "@/shared/api/refresh-coordinator";
import {
  API_BASE,
  SESSION_STORAGE_KEY,
  server,
} from "../../../helpers/mock-server";
import { makeSession } from "../../../helpers/session-fixtures";

/**
 * El portal durante un despliegue del backend.
 *
 * Mientras Coolify cambia los contenedores contesta la pasarela: la reescritura
 * de Next con un 500 en texto plano, o Traefik con `404 page not found`. Se
 * prueban las dos fronteras que hacen seguro repetir —qué es la pasarela y qué
 * operación se puede repetir— y el fallo que más dolía: que un refresco que cae
 * en el hueco mandaba al operador a login con una sesión válida.
 */

const THINGS_URL = `${API_BASE}/internal/things`;
const REFRESH_URL = `${API_BASE}/internal/auth/refresh`;

const proxySinApi = () =>
  new HttpResponse("Internal Server Error", {
    status: 500,
    headers: { "Content-Type": "text/plain" },
  });
const ok = (data: unknown) =>
  HttpResponse.json({ requestId: "r", data }, { status: 200 });

describe("qué responde la pasarela y qué se repite", () => {
  it("sin sobre JSON, un 404/5xx es de la pasarela", () => {
    expect(isGatewayResponse(new Response("", { status: 500 }), "texto")).toBe(
      true,
    );
    expect(isGatewayResponse(new Response("", { status: 404 }), null)).toBe(
      true,
    );
  });

  it("con sobre JSON lo escribió el backend, aunque sea 500 o 503", () => {
    const sobre = { requestId: "r", error: { code: "X", message: "x" } };
    expect(isGatewayResponse(new Response("", { status: 500 }), sobre)).toBe(
      false,
    );
    expect(isGatewayResponse(new Response("", { status: 503 }), sobre)).toBe(
      false,
    );
  });

  it("un 401 vacío no es la pasarela: sigue cerrando la sesión como antes", () => {
    expect(isGatewayResponse(new Response("", { status: 401 }), null)).toBe(
      false,
    );
  });

  it("GET y mutaciones con llave son seguras; el resto sólo si no llegó", () => {
    expect(retryModeFor(undefined, undefined)).toBe("safe");
    expect(retryModeFor("POST", "idk-1")).toBe("safe");
    expect(retryModeFor("POST", undefined)).toBe("undelivered-only");
  });

  it("timeout, corte de red y 504 sólo se repiten en operaciones seguras", () => {
    const corte = new AtlasApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "x",
    });
    const gateway504 = {
      response: new Response("", { status: 504 }),
      payload: null,
    };
    expect(deservesRetry(corte, "safe")).toBe(true);
    expect(deservesRetry(corte, "undelivered-only")).toBe(false);
    expect(deservesRetry(gateway504, "safe")).toBe(true);
    expect(deservesRetry(gateway504, "undelivered-only")).toBe(false);
  });

  it("las esperas crecen, se estancan y se dispersan un 25 %", () => {
    expect([1, 5, 30].map((n) => delayBeforeAttempt(n, () => 0.5))).toEqual([
      1000, 8000, 8000,
    ]);
    expect(delayBeforeAttempt(1, () => 0)).toBe(750);
    expect(delayBeforeAttempt(1, () => 1)).toBe(1250);
  });
});

describe("apiRequest durante un despliegue", () => {
  const originalLocation = Object.getOwnPropertyDescriptor(window, "location");

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE);
    resetRefreshCoordinator();
    resetLoginRedirectLock();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(makeSession({ accessToken: "token-viejo" })),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    server.resetHandlers();
    window.sessionStorage.clear();
    resetRefreshCoordinator();
    resetLoginRedirectLock();
    if (originalLocation)
      Object.defineProperty(window, "location", originalLocation);
  });
  afterAll(() => server.close());

  async function correr<T>(promesa: Promise<T>) {
    const capturada = promesa.then(
      (valor) => ({ valor, error: null as unknown }),
      (error: unknown) => ({ valor: null as T | null, error }),
    );
    await vi.advanceTimersByTimeAsync(120_000);
    return capturada;
  }

  it("una lectura que cae en el hueco termina sola cuando vuelve el API", async () => {
    let llamadas = 0;
    server.use(
      http.get(THINGS_URL, () => {
        llamadas += 1;
        if (llamadas === 1) return proxySinApi();
        if (llamadas === 2)
          return new HttpResponse("404 page not found", { status: 404 });
        return ok({ id: 1 });
      }),
    );

    const { valor, error } = await correr(apiRequest("/internal/things"));

    expect(error).toBeNull();
    expect(valor).toEqual({ id: 1 });
    expect(llamadas).toBe(3);
  });

  it("un error escrito por el backend no se repite", async () => {
    let llamadas = 0;
    server.use(
      http.get(THINGS_URL, () => {
        llamadas += 1;
        return HttpResponse.json(
          { requestId: "r", error: { code: "BOOM", message: "Falló." } },
          { status: 500 },
        );
      }),
    );

    const { error } = await correr(apiRequest("/internal/things"));

    expect(error).toMatchObject({ status: 500, code: "BOOM" });
    expect(llamadas).toBe(1);
  });

  it("una mutación sin llave NO se repite ante un corte de red: pudo haber llegado", async () => {
    let llamadas = 0;
    server.use(
      http.post(THINGS_URL, () => {
        llamadas += 1;
        return HttpResponse.error();
      }),
    );

    const { error } = await correr(
      apiRequest("/internal/things", { method: "POST", body: { a: 1 } }),
    );

    expect(error).toMatchObject({ status: 0 });
    expect(llamadas).toBe(1);
  });

  it("una mutación con llave repite la MISMA llave en cada intento", async () => {
    const llaves: (string | null)[] = [];
    server.use(
      http.post(THINGS_URL, ({ request }) => {
        llaves.push(request.headers.get("Idempotency-Key"));
        return llaves.length < 3 ? proxySinApi() : ok({ id: 2 });
      }),
    );

    const { error } = await correr(
      apiRequest("/internal/things", {
        method: "POST",
        body: {},
        idempotencyKey: "idk-accion-1",
      }),
    );

    expect(error).toBeNull();
    expect(llaves).toEqual(["idk-accion-1", "idk-accion-1", "idk-accion-1"]);
  });

  it("un refresco que cae en el hueco NO borra la sesión ni manda a login", async () => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/internal/things", search: "", replace },
    });
    server.use(
      http.get(THINGS_URL, () => new HttpResponse(null, { status: 401 })),
      http.post(REFRESH_URL, () => proxySinApi()),
    );

    const { error } = await correr(apiRequest("/internal/things"));

    expect(error).toMatchObject({ status: 500 });
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
