import { describe, expect, it } from "vitest";
import {
  conTipo,
  esTexto,
  tipoEfectivo,
} from "@/features/files/tipo-de-archivo";

const nodo = (nombre: string, mimeType: string | null) =>
  ({ nombre, mimeType }) as { nombre: string; mimeType: string | null };

describe("tipoEfectivo", () => {
  it("se queda con lo que dice la respuesta cuando dice algo", () => {
    expect(tipoEfectivo("application/pdf", nodo("x.jpg", "image/jpeg"))).toBe(
      "application/pdf",
    );
  });

  /*
   * La regresión que guardan los tres casos siguientes: un objeto subido con un PUT prefirmado sin
   * `Content-Type` queda en el almacén como `application/octet-stream`, y el extracto bancario se
   * quedaba en blanco dentro del `<iframe>` sin un solo error.
   */
  it("ignora el octet-stream de la respuesta y usa el tipo del nodo", () => {
    expect(
      tipoEfectivo(
        "application/octet-stream",
        nodo("extracto.pdf", "application/pdf"),
      ),
    ).toBe("application/pdf");
  });

  it("cae en la extensión cuando ni la respuesta ni el nodo saben", () => {
    expect(
      tipoEfectivo("application/octet-stream", nodo("extracto.pdf", null)),
    ).toBe("application/pdf");
    expect(
      tipoEfectivo(
        "application/octet-stream",
        nodo("anverso.jpg", "application/octet-stream"),
      ),
    ).toBe("image/jpeg");
  });

  it("devuelve vacío cuando nada lo dice: eso es «descárgalo», no «ábrelo mal»", () => {
    expect(tipoEfectivo(undefined, nodo("recibo", null))).toBe("");
    expect(
      tipoEfectivo("application/octet-stream", nodo("recibo.xyz", null)),
    ).toBe("");
  });
});

describe("conTipo", () => {
  it("rotula el blob con el tipo resuelto", () => {
    const original = new Blob(["%PDF-1.4"], {
      type: "application/octet-stream",
    });
    expect(conTipo(original, "application/pdf").type).toBe("application/pdf");
  });

  it("devuelve el mismo blob si ya está bien rotulado", () => {
    const original = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    expect(conTipo(original, "application/pdf")).toBe(original);
  });

  it("no inventa un tipo cuando no se resolvió ninguno", () => {
    const original = new Blob(["algo"], { type: "application/octet-stream" });
    expect(conTipo(original, "")).toBe(original);
  });
});

describe("esTexto", () => {
  it("reconoce lo que se puede pintar en un <pre>", () => {
    expect(esTexto("application/json")).toBe(true);
    expect(esTexto("text/plain")).toBe(true);
    expect(esTexto("application/xml")).toBe(true);
    expect(esTexto("application/pdf")).toBe(false);
    expect(esTexto("image/jpeg")).toBe(false);
  });
});
