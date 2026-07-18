import { describe, expect, it } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import {
  buildBlockedDirectResult,
  buildDryRunDirectResult,
  buildErrorDirectResult,
  buildMissingParamsDirectResult,
  buildSuccessDirectResult,
  collectSafeHeaders,
  findRequestId,
  safeParseBody,
} from "@/features/qa-lab/direct-result";
import type { QaExpectedResponse } from "@/features/qa-lab/types";

const REAL_ACCESS_TOKEN = "real-session-token-do-not-leak";

function endpointFixture(overrides: Partial<EndpointItem> = {}): EndpointItem {
  return {
    endpointId: "ep-1",
    code: "USERS_LIST",
    method: "GET",
    routePath: "/internal/users",
    fullPath: "/internal/users",
    expectedStatusCodes: [200],
    ...overrides,
  } as unknown as EndpointItem;
}

function builtFixture(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://api.atlas.internal/api/v1/internal/users",
    method: "GET",
    headers: {
      Authorization: `Bearer ${REAL_ACCESS_TOKEN}`,
      "X-Trace-Id": "trace-1",
    },
    ...overrides,
  };
}

function expectedFixture(
  overrides: Partial<QaExpectedResponse> = {},
): QaExpectedResponse {
  return { statusCodes: [200], headers: {}, ...overrides };
}

function successFor(overrides: Record<string, unknown> = {}) {
  const body = (overrides.body as unknown) ?? { data: { id: 1 } };
  const text = JSON.stringify(body);
  return buildSuccessDirectResult({
    endpoint: endpointFixture(),
    built: builtFixture(),
    response: new Response(text, {
      status: (overrides.status as number) ?? 200,
      headers: (overrides.headers as Record<string, string>) ?? {},
    }),
    parsed: { body, sizeBytes: text.length },
    latencyMs: 10,
    timeoutMs: 5_000,
    warnings: [],
    expectedResponse: overrides.expectedResponse as
      QaExpectedResponse | undefined,
  });
}

describe("safeParseBody", () => {
  it("parsea un cuerpo JSON", async () => {
    const parsed = await safeParseBody(new Response('{"a":1}'));
    expect(parsed.body).toEqual({ a: 1 });
  });

  it("una respuesta sin cuerpo no revienta el parseo", async () => {
    const parsed = await safeParseBody(new Response(""));
    expect(parsed).toEqual({ body: null, sizeBytes: 0 });
  });

  /**
   * Un 502 del proxy llega como HTML: si se descartara por no ser JSON, el
   * operador vería un fallo sin ninguna pista de qué respondió el backend.
   */
  it("un cuerpo no-JSON se conserva como texto en vez de perderse", async () => {
    const parsed = await safeParseBody(
      new Response("<html>Bad Gateway</html>"),
    );
    expect(parsed.body).toBe("<html>Bad Gateway</html>");
  });

  it("un JSON truncado se conserva como texto", async () => {
    const parsed = await safeParseBody(new Response('{"a":'));
    expect(parsed.body).toBe('{"a":');
  });

  /**
   * El tamaño se compara contra `maxResponseSizeBytes`: medir caracteres en vez
   * de bytes subestima cualquier respuesta con acentos o emoji.
   */
  it("mide bytes UTF-8, no caracteres", async () => {
    const text = '{"a":"éé🎌"}';
    const parsed = await safeParseBody(new Response(text));
    expect(parsed.sizeBytes).toBe(new TextEncoder().encode(text).length);
    expect(parsed.sizeBytes).toBeGreaterThan(text.length);
  });

  it("un cuerpo ASCII mide lo mismo en bytes que en caracteres", async () => {
    const parsed = await safeParseBody(new Response('{"a":1}'));
    expect(parsed.sizeBytes).toBe(7);
  });
});

describe("findRequestId", () => {
  it("encuentra el request id sin importar cómo venga capitalizado", () => {
    const headers = new Headers({ "X-Request-ID": "req-1" });
    expect(findRequestId(headers)).toBe("req-1");
  });

  it("prefiere x-request-id sobre los alias", () => {
    const headers = new Headers({
      "x-correlation-id": "corr-1",
      "x-request-id": "req-1",
      "request-id": "plain-1",
    });
    expect(findRequestId(headers)).toBe("req-1");
  });

  it("cae a x-correlation-id cuando no hay x-request-id", () => {
    const headers = new Headers({ "x-correlation-id": "corr-1" });
    expect(findRequestId(headers)).toBe("corr-1");
  });

  it("devuelve undefined si el backend no correla la petición", () => {
    expect(findRequestId(new Headers())).toBeUndefined();
  });
});

describe("collectSafeHeaders", () => {
  it("redacta las cabeceras sensibles de la respuesta", () => {
    const headers = new Headers({
      "set-cookie": "session=abc123",
      "content-type": "application/json",
    });
    const safe = collectSafeHeaders(headers);
    expect(safe["set-cookie"]).not.toContain("abc123");
    expect(safe["content-type"]).toBe("application/json");
  });

  it("no pierde las cabeceras inocuas", () => {
    const safe = collectSafeHeaders(new Headers({ "x-trace-id": "trace-1" }));
    expect(safe["x-trace-id"]).toBe("trace-1");
  });
});

describe("buildDryRunDirectResult", () => {
  it("marca el resultado como dry-run y no inventa respuesta", () => {
    const result = buildDryRunDirectResult(builtFixture(), []);
    expect(result.dryRun).toBe(true);
    expect(result.httpStatus).toBeUndefined();
    expect(result.assertions).toBeUndefined();
    expect(result.latencyMs).toBeUndefined();
  });

  /**
   * El preview del dry-run se pinta en pantalla sin que salga ninguna petición:
   * es exactamente donde se filtraría el token si no se redactara.
   */
  it("nunca expone el token de sesión en el preview", () => {
    const result = buildDryRunDirectResult(builtFixture(), []);
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("conserva las cabeceras no sensibles del preview", () => {
    const result = buildDryRunDirectResult(builtFixture(), []);
    expect(result.requestHeaders?.["X-Trace-Id"]).toBe("trace-1");
  });
});

describe("buildSuccessDirectResult", () => {
  it("propaga el estado y el ok de la respuesta real", () => {
    const result = successFor({ status: 201 });
    expect(result).toMatchObject({ httpStatus: 201, ok: true, dryRun: false });
  });

  it("un 500 no se reporta como ok", () => {
    const result = successFor({ status: 500 });
    expect(result.ok).toBe(false);
  });

  it("captura el request id de la respuesta", () => {
    const result = successFor({ headers: { "x-request-id": "req-9" } });
    expect(result.responseRequestId).toBe("req-9");
  });

  it("sanea el cuerpo antes de exponerlo", () => {
    const result = successFor({ body: { data: { password: "hunter2" } } });
    expect(result.responseBody).toEqual({ data: { password: "[redacted]" } });
  });

  /**
   * Las aserciones se evalúan sobre el cuerpo YA saneado, así que un secreto
   * que devuelva el backend no puede volver al resultado por la puerta de atrás
   * del campo `actual` (texto libre que se renderiza en la tarjeta).
   *
   * Ojo: `expected` sí puede contener lo que el operador escribió en
   * "bodyContains" — eso es entrada suya, no una fuga de la respuesta.
   */
  it("un secreto que devuelve el backend no reaparece en el detalle de la aserción", () => {
    const result = successFor({
      body: { accessToken: "secreto-del-backend", data: "publico" },
      expectedResponse: expectedFixture({ bodyContains: "publico" }),
    });
    const assertion = result.assertions?.items.find(
      (item) => item.name === "Contenido de respuesta",
    );
    expect(assertion?.passed).toBe(true);
    expect(assertion?.actual).not.toContain("secreto-del-backend");
    expect(JSON.stringify(result)).not.toContain("secreto-del-backend");
  });

  it("evalúa las aserciones del run", () => {
    const result = successFor({ status: 500 });
    expect(result.assertions?.passed).toBe(false);
    expect(result.assertions?.items.length).toBeGreaterThanOrEqual(2);
  });

  it("redacta las cabeceras de la petición", () => {
    expect(JSON.stringify(successFor())).not.toContain(REAL_ACCESS_TOKEN);
  });
});

describe("buildErrorDirectResult", () => {
  /**
   * El abort lo dispara el propio timeout del lab: sin traducir, el operador
   * leía "The operation was aborted" y no sabía que había sido su propio límite.
   */
  it("traduce un abort en un mensaje de timeout entendible", () => {
    const result = buildErrorDirectResult(
      builtFixture(),
      5_000,
      [],
      new DOMException("The operation was aborted", "AbortError"),
    );
    expect(result.error).toBe("Timeout de ejecución alcanzado.");
  });

  it("conserva el mensaje de un error de red real", () => {
    const result = buildErrorDirectResult(
      builtFixture(),
      12,
      [],
      new TypeError("Failed to fetch"),
    );
    expect(result.error).toBe("Failed to fetch");
  });

  it("un throw que no es Error no deja el resultado sin explicación", () => {
    const result = buildErrorDirectResult(builtFixture(), 12, [], "boom");
    expect(result.error).toBe("Error de red");
  });

  it("no marca como dry-run un intento que sí salió a la red", () => {
    const result = buildErrorDirectResult(
      builtFixture(),
      12,
      [],
      new Error("x"),
    );
    expect(result.dryRun).toBe(false);
    expect(result.latencyMs).toBe(12);
  });

  it("no expone el token al reportar el error", () => {
    const result = buildErrorDirectResult(
      builtFixture(),
      12,
      [],
      new Error("x"),
    );
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });
});

describe("buildBlockedDirectResult", () => {
  /**
   * Este es el resultado del bloqueo por host no confiable: el motivo tiene que
   * llegar al operador, si no ve un fallo mudo y lo reintenta.
   */
  it("conserva el motivo del bloqueo", () => {
    const result = buildBlockedDirectResult(
      builtFixture(),
      false,
      [],
      new Error("Host no permitido: evil.example.com"),
    );
    expect(result.error).toContain("evil.example.com");
  });

  it("un bloqueo sin Error explica igualmente qué pasó", () => {
    const result = buildBlockedDirectResult(builtFixture(), false, [], "nope");
    expect(result.error).toBe("Ejecución bloqueada.");
  });

  it("respeta si el intento bloqueado era un dry-run", () => {
    expect(
      buildBlockedDirectResult(builtFixture(), true, [], new Error("x")).dryRun,
    ).toBe(true);
  });

  it("un bloqueo no reporta respuesta ninguna", () => {
    const result = buildBlockedDirectResult(
      builtFixture(),
      false,
      [],
      new Error("x"),
    );
    expect(result.httpStatus).toBeUndefined();
    expect(result.responseBody).toBeUndefined();
  });

  it("no expone el token del intento bloqueado", () => {
    const result = buildBlockedDirectResult(
      builtFixture(),
      false,
      [],
      new Error("x"),
    );
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });
});

describe("buildMissingParamsDirectResult", () => {
  it("nombra los path params que faltan por resolver", () => {
    const result = buildMissingParamsDirectResult(
      { ...builtFixture(), unresolvedPathParams: ["customerId", "accountId"] },
      [],
    );
    expect(result.error).toBe("Faltan path params: customerId, accountId");
  });

  it("no se reporta como dry-run: es un intento real que no salió", () => {
    const result = buildMissingParamsDirectResult(
      { ...builtFixture(), unresolvedPathParams: ["id"] },
      ["aviso"],
    );
    expect(result.dryRun).toBe(false);
    expect(result.warnings).toEqual(["aviso"]);
  });

  it("no expone el token", () => {
    const result = buildMissingParamsDirectResult(
      { ...builtFixture(), unresolvedPathParams: ["id"] },
      [],
    );
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });
});
