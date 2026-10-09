import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ADM-04: el respaldo de progreso exige sesión y toma el usuario de ELLA, nunca del cliente.
 *
 * La sesión se pregunta a AtlasBackend (`/internal/auth/me`) reenviando sólo cookie,
 * `authorization` y `x-tenant-id`, con caché corta (el backend limita esa ruta por IP y todo sale
 * de la IP del portal).
 */
vi.mock("@/shared/api/transport", () => ({ rawFetch: vi.fn() }));
vi.mock(
  "@/features/qa-tutorials/server/progress-store",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/features/qa-tutorials/server/progress-store")
      >();
    return { ...original, loadProgress: vi.fn(), saveProgress: vi.fn() };
  },
);

const { rawFetch } = await import("@/shared/api/transport");
const store = await import("@/features/qa-tutorials/server/progress-store");
const { clearSessionCache } =
  await import("@/features/qa-tutorials/server/session-user");
const { GET, PUT } = await import("@/app/api/qa-tutorials/progress/route");

const PROGRESO = {
  tutorialId: "qa-stress-profile",
  version: 1,
  status: "in-progress",
  lastStepIndex: 2,
  percent: 40,
  timesStarted: 1,
};

function me(userId: string | number) {
  return new Response(
    JSON.stringify({ data: { user: { id: userId, email: "a@b.c" } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function peticion(
  method: "GET" | "PUT",
  headers: Record<string, string> = {},
  body?: string,
): Request {
  return new Request("http://portal.test/api/qa-tutorials/progress?userId=99", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

const CON_COOKIE = {
  cookie: "atlas_internal_access=abc",
  "x-tenant-id": "1",
  "x-otra": "no-viaja",
};

describe("/api/qa-tutorials/progress", () => {
  beforeEach(() => {
    clearSessionCache();
    vi.stubEnv("INTERNAL_API_ORIGIN", "http://api.interna:3005/");
    vi.mocked(store.loadProgress).mockResolvedValue([]);
    vi.mocked(store.saveProgress).mockResolvedValue([]);
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("sin credenciales responde 401 sin molestar al backend", async () => {
    const respuesta = await GET(peticion("GET"));
    expect(respuesta.status).toBe(401);
    expect(rawFetch).not.toHaveBeenCalled();
    expect(store.loadProgress).not.toHaveBeenCalled();
  });

  it("valida la sesión en el backend reenviando SÓLO cookie, authorization y tenant", async () => {
    vi.mocked(rawFetch).mockResolvedValue(me(7));
    const respuesta = await GET(
      peticion("GET", { ...CON_COOKIE, authorization: "Bearer t" }),
    );
    expect(respuesta.status).toBe(200);
    const [url, init] = vi.mocked(rawFetch).mock.calls[0]!;
    expect(url).toBe("http://api.interna:3005/api/v1/internal/auth/me");
    expect(init.headers).toEqual({
      accept: "application/json",
      cookie: "atlas_internal_access=abc",
      authorization: "Bearer t",
      "x-tenant-id": "1",
    });
    // El usuario de la sesión (7), no el de la query (99).
    expect(store.loadProgress).toHaveBeenCalledWith("7");
  });

  it("el PUT ignora el `userId` del cuerpo y guarda para el de la sesión", async () => {
    vi.mocked(rawFetch).mockResolvedValue(me("12"));
    const respuesta = await PUT(
      peticion(
        "PUT",
        CON_COOKIE,
        JSON.stringify({ userId: "99", progress: PROGRESO }),
      ),
    );
    expect(respuesta.status).toBe(200);
    expect(store.saveProgress).toHaveBeenCalledWith("12", PROGRESO);
  });

  it("guarda la respuesta del backend un rato: la segunda llamada no vuelve a preguntar", async () => {
    vi.mocked(rawFetch).mockImplementation(async () => me(7));
    await GET(peticion("GET", CON_COOKIE));
    await GET(peticion("GET", CON_COOKIE));
    expect(rawFetch).toHaveBeenCalledTimes(1);
    // Otra cookie es otra sesión: se pregunta.
    await GET(peticion("GET", { cookie: "atlas_internal_access=otra" }));
    expect(rawFetch).toHaveBeenCalledTimes(2);
  });

  it("también recuerda el «no»: una cookie inválida no martillea al backend", async () => {
    vi.mocked(rawFetch).mockImplementation(
      async () => new Response("{}", { status: 401 }),
    );
    expect((await GET(peticion("GET", CON_COOKIE))).status).toBe(401);
    expect((await GET(peticion("GET", CON_COOKIE))).status).toBe(401);
    expect(rawFetch).toHaveBeenCalledTimes(1);
  });

  it("si el backend no contesta, 503 y no se cachea", async () => {
    vi.mocked(rawFetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect((await GET(peticion("GET", CON_COOKIE))).status).toBe(503);
    vi.mocked(rawFetch).mockResolvedValueOnce(
      new Response("{}", { status: 500 }),
    );
    expect((await GET(peticion("GET", CON_COOKIE))).status).toBe(503);
    expect(rawFetch).toHaveBeenCalledTimes(2);
  });

  it("un 200 sin usuario es como no tener sesión", async () => {
    vi.mocked(rawFetch).mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    expect((await GET(peticion("GET", CON_COOKIE))).status).toBe(401);
  });

  it("un anónimo no llega a escribir: 401 antes de leer el cuerpo", async () => {
    const respuesta = await PUT(
      peticion("PUT", {}, JSON.stringify({ progress: PROGRESO })),
    );
    expect(respuesta.status).toBe(401);
    expect(store.saveProgress).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo enorme con 413", async () => {
    vi.mocked(rawFetch).mockResolvedValue(me(7));
    const enorme = JSON.stringify({
      progress: { ...PROGRESO, startedAt: "x".repeat(20_000) },
    });
    const respuesta = await PUT(peticion("PUT", CON_COOKIE, enorme));
    expect(respuesta.status).toBe(413);
    expect(store.saveProgress).not.toHaveBeenCalled();
  });

  it("rechaza un JSON ilegible con 400", async () => {
    vi.mocked(rawFetch).mockResolvedValue(me(7));
    const respuesta = await PUT(peticion("PUT", CON_COOKIE, "{no es json"));
    expect(respuesta.status).toBe(400);
  });

  it.each([
    ["un tutorialId con caracteres raros", { tutorialId: "../../etc" }],
    ["un tutorialId larguísimo", { tutorialId: "a".repeat(101) }],
    ["una fecha de megas", { startedAt: "2".repeat(41) }],
    ["un porcentaje imposible", { percent: 101 }],
  ])("rechaza %s con 422", async (_caso, cambio) => {
    vi.mocked(rawFetch).mockResolvedValue(me(7));
    const respuesta = await PUT(
      peticion(
        "PUT",
        CON_COOKIE,
        JSON.stringify({ progress: { ...PROGRESO, ...cambio } }),
      ),
    );
    expect(respuesta.status).toBe(422);
  });

  it("al pasarse del máximo de tutoriales por usuario responde 409", async () => {
    vi.mocked(rawFetch).mockResolvedValue(me(7));
    vi.mocked(store.saveProgress).mockRejectedValue(
      new store.ProgressLimitError(),
    );
    const respuesta = await PUT(
      peticion("PUT", CON_COOKIE, JSON.stringify({ progress: PROGRESO })),
    );
    expect(respuesta.status).toBe(409);
  });
});
