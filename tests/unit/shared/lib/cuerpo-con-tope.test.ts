import { describe, expect, it } from "vitest";
import { leerCuerpoConTope } from "@/shared/lib/cuerpo-con-tope";

function flujo(...trozos: string[]): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder();
  return new ReadableStream({
    start(control) {
      for (const t of trozos) control.enqueue(codificador.encode(t));
      control.close();
    },
  });
}

describe("leer un cuerpo con tope", () => {
  it("junta los trozos cuando caben", async () => {
    const leido = await leerCuerpoConTope(flujo("ab", "cd"), 4);
    expect(leido.ok).toBe(true);
    if (leido.ok) expect(new TextDecoder().decode(leido.bytes)).toBe("abcd");
  });

  it("corta en cuanto se pasa del tope", async () => {
    expect((await leerCuerpoConTope(flujo("ab", "cde"), 4)).ok).toBe(false);
  });

  it("sin cuerpo devuelve cero bytes", async () => {
    const leido = await leerCuerpoConTope(null, 4);
    expect(leido).toEqual({ ok: true, bytes: new Uint8Array(0) });
  });
});
