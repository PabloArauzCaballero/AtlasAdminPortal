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
import { resetRefreshCoordinator } from "@/shared/api/refresh-coordinator";
import { UNKNOWN_OUTCOME_MESSAGE } from "@/shared/api/response";
import {
  API_BASE,
  SESSION_STORAGE_KEY,
  server,
} from "../../../helpers/mock-server";
import { makeSession } from "../../../helpers/session-fixtures";

/**
 * Portado de `admin-reintentos.diag.ts` (plan de producción 2026-09-24,
 * ATL-04 / FND-ADMIN-01/03). Antes: un POST sin llave ante un 5xx en texto se
 * mandaba 8-9 veces (12 con un 401 de por medio), y un 200 con HTML o con
 * `{ success: false }` se daba por éxito.
 */

const URL_ = `${API_BASE}/internal/things`;
const REFRESH_URL = `${API_BASE}/internal/auth/refresh`;
const texto = (status: number, body = "Internal Server Error") =>
  new HttpResponse(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });

let llamadas: Request[] = [];

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  llamadas = [];
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

function responder(
  metodo: "post" | "patch" | "delete",
  fn: (n: number) => Response,
) {
  server.use(
    http[metodo](URL_, ({ request }) => {
      llamadas.push(request.clone());
      return fn(llamadas.length);
    }),
  );
}

describe("mutación sin llave ante un desenlace ambiguo", () => {
  for (const status of [404, 500, 502, 503, 504]) {
    for (const metodo of ["post", "patch", "delete"] as const) {
      it(`${metodo.toUpperCase()} ante ${status} en texto: un envío y resultado desconocido`, async () => {
        responder(metodo, () => texto(status));
        const { error } = await correr(
          apiRequest("/internal/things", {
            method: metodo.toUpperCase(),
            body: {},
          }),
        );
        expect(llamadas).toHaveLength(1);
        expect(error).toMatchObject({
          code: "UNKNOWN_OUTCOME",
          message: UNKNOWN_OUTCOME_MESSAGE,
        });
      });
    }
  }

  it("el mensaje no pide repetir a ciegas ni usa jerga técnica", () => {
    expect(UNKNOWN_OUTCOME_MESSAGE).not.toMatch(
      /int[eé]ntelo otra vez|HTTP|backend|endpoint|servidor|\d{3}/i,
    );
    expect(UNKNOWN_OUTCOME_MESSAGE).toMatch(/revise si ya aparece registrada/);
  });

  it("401 → refresco → 502: el POST sale dos veces, no 12", async () => {
    server.use(
      http.post(REFRESH_URL, () =>
        HttpResponse.json({
          data: makeSession({ accessToken: "token-nuevo" }),
        }),
      ),
    );
    responder("post", (n) =>
      n === 1 ? new HttpResponse(null, { status: 401 }) : texto(502),
    );
    const { error } = await correr(
      apiRequest("/internal/things", { method: "POST", body: {} }),
    );
    expect(llamadas).toHaveLength(2);
    expect(error).toMatchObject({ code: "UNKNOWN_OUTCOME" });
  });
});

describe("mutación con llave", () => {
  it("una llave puesta a mano en headers activa el modo seguro con la MISMA llave", async () => {
    responder("post", (n) =>
      n < 3 ? texto(502) : HttpResponse.json({ data: { id: 1 } }),
    );
    const { valor, error } = await correr(
      apiRequest("/internal/things", {
        method: "POST",
        body: {},
        headers: { "x-idempotency-key": "k-mano" },
      }),
    );
    expect(error).toBeNull();
    expect(valor).toEqual({ id: 1 });
    expect(llamadas.map((r) => r.headers.get("x-idempotency-key"))).toEqual([
      "k-mano",
      "k-mano",
      "k-mano",
    ]);
    expect(llamadas.every((r) => !r.headers.has("idempotency-key"))).toBe(true);
  });

  it("si la pasarela no se recupera, el resultado es desconocido", async () => {
    responder("post", () => texto(502));
    const { error } = await correr(
      apiRequest("/internal/things", {
        method: "POST",
        body: {},
        idempotencyKey: "k",
      }),
    );
    expect(llamadas.length).toBeGreaterThan(1);
    expect(error).toMatchObject({ code: "UNKNOWN_OUTCOME" });
  });
});

describe("un 2xx fuera de contrato no es éxito", () => {
  it("200 text/html en un POST → resultado desconocido", async () => {
    responder("post", () => texto(200, "<html>login</html>"));
    const { error } = await correr(
      apiRequest("/internal/things", { method: "POST", body: {} }),
    );
    expect(error).toMatchObject({ code: "UNKNOWN_OUTCOME" });
  });

  it("200 text/html en un GET → error de respuesta ilegible", async () => {
    server.use(http.get(URL_, () => texto(200, "<html>login</html>")));
    const { error } = await correr(apiRequest("/internal/things"));
    expect(error).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("200 {success:false} → error con el motivo del backend", async () => {
    responder("post", () =>
      HttpResponse.json({
        success: false,
        error: { code: "NOPE", message: "Rechazado." },
      }),
    );
    const { error } = await correr(
      apiRequest("/internal/things", { method: "POST", body: {} }),
    );
    expect(error).toMatchObject({ code: "NOPE", message: "Rechazado." });
  });

  it("200 {success:false} sin motivo → error igualmente", async () => {
    responder("post", () => HttpResponse.json({ success: false }));
    const { error } = await correr(
      apiRequest("/internal/things", { method: "POST", body: {} }),
    );
    expect(error).toMatchObject({ code: "REJECTED_WITHOUT_REASON" });
  });

  it("204 sin cuerpo → éxito", async () => {
    responder("delete", () => new HttpResponse(null, { status: 204 }));
    const { valor, error } = await correr(
      apiRequest("/internal/things", { method: "DELETE" }),
    );
    expect(error).toBeNull();
    expect(valor).toBeNull();
    expect(llamadas).toHaveLength(1);
  });
});
