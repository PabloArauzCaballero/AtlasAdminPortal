import { describe, expect, it } from "vitest";
import { AtlasApiError, isAtlasApiError } from "@/shared/api/errors";

function makeError() {
  return new AtlasApiError({
    status: 403,
    code: "FORBIDDEN",
    message: "No tienes permisos.",
    requestId: "req_abc123",
    payload: {
      requestId: "req_abc123",
      error: { code: "FORBIDDEN", message: "No tienes permisos." },
      timestamp: "2026-07-16T12:00:00.000Z",
    },
  });
}

describe("AtlasApiError", () => {
  it("expone status, code y requestId", () => {
    const error = makeError();

    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.requestId).toBe("req_abc123");
  });

  it("usa el mensaje como message de Error", () => {
    expect(makeError().message).toBe("No tienes permisos.");
  });

  it("se identifica con name AtlasApiError", () => {
    expect(makeError().name).toBe("AtlasApiError");
  });

  it("sigue siendo instancia de Error", () => {
    expect(makeError()).toBeInstanceOf(Error);
  });

  it("permite omitir requestId y payload", () => {
    const error = new AtlasApiError({
      status: 500,
      code: "INTERNAL",
      message: "Error inesperado.",
    });

    expect(error.requestId).toBeUndefined();
    expect(error.payload).toBeUndefined();
  });
});

describe("isAtlasApiError", () => {
  it("reconoce un AtlasApiError", () => {
    expect(isAtlasApiError(makeError())).toBe(true);
  });

  it.each([
    ["un Error común", new Error("boom")],
    ["null", null],
    ["undefined", undefined],
    ["un objeto plano parecido", { status: 403, code: "FORBIDDEN" }],
    ["una cadena", "FORBIDDEN"],
  ])("descarta %s", (_label, value) => {
    expect(isAtlasApiError(value)).toBe(false);
  });
});
