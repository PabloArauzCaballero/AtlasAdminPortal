import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: vi.fn(),
}));

import { runStressBurst } from "@/features/qa-lab/stress-runner";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import {
  endpointFixture,
  EVIL_HOST_URL,
  fetchCallsContain,
  jsonResponder,
  jsonResponse,
  REAL_ACCESS_TOKEN,
  REAL_CSRF_TOKEN,
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
  vi.clearAllMocks();
});

describe("runStressBurst · allowlist de host", () => {
  it("lanza sin haber disparado un solo fetch si el host manual no es confiable", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({
          baseRouteKey: "CUSTOM_HOST",
          customHostUrl: EVIL_HOST_URL,
        }),
      ),
    ).rejects.toThrow(/allowlist/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloquea el host ajeno incluso en dry-run", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({
          dryRun: true,
          baseRouteKey: "CUSTOM_HOST",
          customHostUrl: EVIL_HOST_URL,
        }),
      ),
    ).rejects.toThrow(/allowlist/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloquea un routeOverride absoluto hacia un host ajeno", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({ routeOverride: `${EVIL_HOST_URL}/collect` }),
      ),
    ).rejects.toThrow(/allowlist/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un burst contra un host ajeno no manda el token por ningún argumento de fetch", async () => {
    await runStressBurst(
      endpointFixture(),
      stressInputFixture({
        baseRouteKey: "CUSTOM_HOST",
        customHostUrl: EVIL_HOST_URL,
      }),
    ).catch(() => undefined);

    expect(fetchCallsContain(fetchMock, REAL_ACCESS_TOKEN)).toBe(false);
    expect(fetchCallsContain(fetchMock, REAL_CSRF_TOKEN)).toBe(false);
  });
});

describe("runStressBurst · puertas de seguridad operativa", () => {
  it("exige ticket de aprobación para un stress real", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({ approvalTicket: undefined }),
      ),
    ).rejects.toThrow(/ticket de aprobación/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza un ticket demasiado corto como si no existiera", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({ approvalTicket: "  x  " }),
      ),
    ).rejects.toThrow(/ticket de aprobación/);
  });

  it("no exige ticket en dry-run", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ dryRun: true, approvalTicket: undefined }),
    );

    expect(result.dryRun).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloquea el stress real de un endpoint mutante sin permitir mutaciones", async () => {
    await expect(
      runStressBurst(
        endpointFixture({ method: "POST", isReadonly: false }),
        stressInputFixture({ allowMutations: false }),
      ),
    ).rejects.toThrow(/permitir mutación real/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloquea el stress real contra producción readonly", async () => {
    await expect(
      runStressBurst(
        endpointFixture(),
        stressInputFixture({ environment: "PRODUCTION_READONLY" }),
      ),
    ).rejects.toThrow(/readonly/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no ejecuta un stress real con path params sin resolver", async () => {
    await expect(
      runStressBurst(
        endpointFixture({ fullPath: "/internal/users/:userId" }),
        stressInputFixture({ pathParams: {} }),
      ),
    ).rejects.toThrow(/userId/);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("runStressBurst · ejecución del plan", () => {
  it("dispara exactamente totalRequests fetches (el plan recorta a maxRequests)", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      // 100 rps * 1 s = 100 planeadas, pero maxRequests=3 manda.
      stressInputFixture({
        targetRps: 100,
        durationSeconds: 1,
        maxRequests: 3,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.totalRequests).toBe(3);
    expect(result.plannedRequests).toBe(100);
    expect(result.capped).toBe(true);
  });

  it("nunca supera el tope duro de 10.000 requests aunque el operador pida más", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({
        dryRun: true,
        approvalTicket: undefined,
        targetRps: 500,
        durationSeconds: 3_600,
        maxRequests: 1_000_000,
      }),
    );

    expect(result.totalRequests).toBe(10_000);
    expect(result.warnings.join(" ")).toContain("10000");
  });

  it("no mantiene más peticiones en vuelo que la concurrencia configurada", async () => {
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return jsonResponse({ ok: true });
    });

    await runStressBurst(
      endpointFixture(),
      stressInputFixture({ targetRps: 500, maxRequests: 8, concurrency: 2 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("cada muestra manda el token solo porque el host es la base propia del portal", async () => {
    await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 2 }),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.atlas.internal/api/v1/internal/users");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${REAL_ACCESS_TOKEN}`,
    );
    expect(init.credentials).toBe("include");
  });

  it("cuenta como error una muestra con status inesperado", async () => {
    fetchMock.mockImplementation(jsonResponder({}, { status: 503 }));

    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 2 }),
    );

    expect(result.errorCount).toBe(2);
    expect(result.successCount).toBe(0);
    expect(result.errorRate).toBe(1);
    expect(result.statusCounts["503"]).toBe(2);
  });

  it("un fallo de red no aborta el burst: se contabiliza y se sigue", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementation(jsonResponder({ ok: true }));

    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 3 }),
    );

    expect(result.totalRequests).toBe(3);
    expect(result.errorCount).toBe(1);
    expect(result.successCount).toBe(2);
    expect(result.statusCounts.TypeError).toBe(1);
  });

  it("clasifica un abort como Timeout, distinguiéndolo de un error de red", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 2 }),
    );

    expect(result.statusCounts.Timeout).toBe(2);
  });

  it("un dry-run no dispara fetch y reporta el plan", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({
        dryRun: true,
        targetRps: 10,
        durationSeconds: 2,
        maxRequests: 100,
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.totalRequests).toBe(20);
  });
});

describe("runStressBurst · volumen del log (regresión F5_R14_LOGS)", () => {
  it("no emite una línea de log por muestra correcta: el visor no debe ahogarse", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ targetRps: 500, maxRequests: 50 }),
    );

    // El logger nace en minLevel "info": las 50 muestras `debug` desaparecen.
    // Solo quedan las líneas de plan/seguridad/transporte, que son un puñado.
    expect(fetchMock).toHaveBeenCalledTimes(50);
    expect(result.pinoLogLines?.length).toBeLessThan(10);
    expect(result.pinoLogLines?.join("\n")).not.toContain("stress.sample");
  });

  it("las muestras fallidas SÍ se registran: son la señal que se quiere conservar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 2 }),
    );

    const errorLines = (result.pinoLogLines ?? []).filter((line) =>
      line.includes("stress.sample_error"),
    );
    expect(errorLines).toHaveLength(2);
  });

  it("el log del stress nunca contiene el token de sesión en claro", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 2 }),
    );

    expect(result.pinoLogLines?.join("\n")).not.toContain(REAL_ACCESS_TOKEN);
    expect(JSON.stringify(result.requestHeaders)).not.toContain(
      REAL_ACCESS_TOKEN,
    );
  });

  it("adjunta el fichero de log del burst", async () => {
    const result = await runStressBurst(
      endpointFixture(),
      stressInputFixture({ maxRequests: 1 }),
    );

    expect(result.pinoLogFileName).toMatch(/^\.logs\/qa-stress-ep-1-/);
  });
});
