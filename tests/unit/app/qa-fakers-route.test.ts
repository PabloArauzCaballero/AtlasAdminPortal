import { afterEach, describe, expect, it, vi } from "vitest";
import { QA_FAKERS_MAX_BODY_BYTES } from "@/features/qa-lab/fakers/faker-proxy";

/** El reenvío al generador de datos de prueba no carga en memoria un cuerpo más grande que su tope. */
const { POST } = await import("@/app/api/qa-fakers/[...path]/route");

const contexto = { params: Promise.resolve({ path: ["fakers", "persona"] }) };

describe("reenvío al generador de datos de prueba", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("un cuerpo por encima del tope → 413 sin salir a la red", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    const peticion = new Request("https://portal.test/api/qa-fakers/x", {
      method: "POST",
      body: "x".repeat(QA_FAKERS_MAX_BODY_BYTES + 1),
    });

    const respuesta = await POST(peticion, contexto);

    expect(respuesta.status).toBe(413);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
