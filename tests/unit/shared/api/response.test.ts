import { describe, expect, it } from "vitest";
import {
  extractData,
  parseJsonSafely,
  toAtlasApiError,
} from "@/shared/api/response";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function errorPayload(code: string, message: string, requestId?: string) {
  return {
    ...(requestId ? { requestId } : {}),
    error: { code, message },
    timestamp: "2026-07-16T12:00:00.000Z",
  };
}

describe("parseJsonSafely", () => {
  it("devuelve null ante una respuesta con cuerpo vacío", async () => {
    await expect(parseJsonSafely(new Response(""))).resolves.toBeNull();
  });

  it("devuelve null ante un 204 sin contenido", async () => {
    await expect(
      parseJsonSafely(new Response(null, { status: 204 })),
    ).resolves.toBeNull();
  });

  it("parsea un cuerpo JSON válido", async () => {
    await expect(parseJsonSafely(jsonResponse({ ok: true }))).resolves.toEqual({
      ok: true,
    });
  });

  it("devuelve el texto crudo si el cuerpo no es JSON", async () => {
    await expect(
      parseJsonSafely(new Response("<html>502 Bad Gateway</html>")),
    ).resolves.toBe("<html>502 Bad Gateway</html>");
  });

  it("no lanza ante un JSON truncado", async () => {
    await expect(parseJsonSafely(new Response('{"a":'))).resolves.toBe('{"a":');
  });
});

describe("extractData", () => {
  it("desenvuelve el sobre { data }", () => {
    expect(extractData<{ id: string }>({ data: { id: "x1" } })).toEqual({
      id: "x1",
    });
  });

  it("devuelve el payload tal cual si no hay sobre", () => {
    expect(extractData<{ id: string }>({ id: "x1" })).toEqual({ id: "x1" });
  });

  it("mapea pagination a meta en listados paginados", () => {
    const data = {
      items: [{ id: "a" }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    expect(extractData<Record<string, unknown>>({ data })).toMatchObject({
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("no pisa meta si el backend ya la envía", () => {
    const data = {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      meta: { page: 9, limit: 9, total: 9, totalPages: 9 },
    };

    expect(extractData<Record<string, unknown>>({ data })).toMatchObject({
      meta: { page: 9 },
    });
  });

  it("no inventa meta si hay items pero no pagination", () => {
    const data = { items: [{ id: "a" }] };
    expect(extractData<Record<string, unknown>>({ data })).not.toHaveProperty(
      "meta",
    );
  });

  it.each([
    ["null", null],
    ["una cadena", "texto"],
    ["un número", 42],
  ])("devuelve %s sin tocarlo", (_label, value) => {
    expect(extractData(value)).toBe(value);
  });
});

describe("toAtlasApiError", () => {
  it.each([401, 403, 404, 409, 422, 429, 500])(
    "conserva el status %i del backend",
    (status) => {
      const error = toAtlasApiError(
        jsonResponse(errorPayload("SOME_CODE", "Falló."), { status }),
        errorPayload("SOME_CODE", "Falló."),
      );

      expect(error.status).toBe(status);
    },
  );

  it("usa el code y el message del payload del backend", () => {
    const payload = errorPayload("FORBIDDEN", "No tienes permisos.");
    const error = toAtlasApiError(
      jsonResponse(payload, { status: 403 }),
      payload,
    );

    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("No tienes permisos.");
  });

  it("toma el requestId del cuerpo cuando viene", () => {
    const payload = errorPayload("CONFLICT", "Conflicto.", "req_body_1");
    const error = toAtlasApiError(
      jsonResponse(payload, { status: 409 }),
      payload,
    );

    expect(error.requestId).toBe("req_body_1");
  });

  it("toma el requestId del header x-request-id si el cuerpo no lo trae", () => {
    const payload = errorPayload("CONFLICT", "Conflicto.");
    const error = toAtlasApiError(
      jsonResponse(payload, {
        status: 409,
        headers: { "x-request-id": "req_header_1" },
      }),
      payload,
    );

    expect(error.requestId).toBe("req_header_1");
  });

  it("prioriza el requestId del cuerpo sobre el del header", () => {
    const payload = errorPayload("CONFLICT", "Conflicto.", "req_body_1");
    const error = toAtlasApiError(
      jsonResponse(payload, {
        status: 409,
        headers: { "x-request-id": "req_header_1" },
      }),
      payload,
    );

    expect(error.requestId).toBe("req_body_1");
  });

  it("acepta x-correlation-id como alternativa", () => {
    const error = toAtlasApiError(
      new Response("", {
        status: 500,
        headers: { "x-correlation-id": "corr_1" },
      }),
      null,
    );

    expect(error.requestId).toBe("corr_1");
  });

  it("deja requestId indefinido si no hay ni cuerpo ni headers", () => {
    const error = toAtlasApiError(new Response("", { status: 500 }), null);
    expect(error.requestId).toBeUndefined();
  });

  describe("payload que no respeta el contrato de error", () => {
    it.each([
      ["null", null],
      ["texto plano (ej. HTML de un proxy)", "<html>502</html>"],
      ["objeto sin error", { mensaje: "raro" }],
      ["error sin message", { error: { code: "X" } }],
    ])("cae en HTTP_<status> con %s", (_label, payload) => {
      const error = toAtlasApiError(new Response("", { status: 502 }), payload);

      expect(error.code).toBe("HTTP_502");
      expect(error.message).toBe("No se pudo completar la operación.");
    });
  });
});
