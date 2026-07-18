import { describe, expect, it } from "vitest";
import { uniqueTextOptions } from "@/shared/lib/options";

describe("uniqueTextOptions", () => {
  it("deduplica valores repetidos", () => {
    // Los valores salen de una lista del backend: sin dedupe, el <select> de
    // filtro repetiría la misma opción tantas veces como filas la usen.
    expect(uniqueTextOptions(["a", "b", "a"])).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
  });

  it("descarta null, undefined y cadenas vacías", () => {
    expect(uniqueTextOptions([null, undefined, "", "a"])).toEqual([
      { value: "a", label: "a" },
    ]);
  });

  it("descarta valores que solo tienen espacios", () => {
    // `"   "` es truthy: sin el trim previo se colaría una opción en blanco.
    expect(uniqueTextOptions(["   ", "a"])).toEqual([
      { value: "a", label: "a" },
    ]);
  });

  it("recorta los espacios y deduplica lo que solo difiere en ellos", () => {
    expect(uniqueTextOptions([" a ", "a"])).toEqual([
      { value: "a", label: "a" },
    ]);
  });

  it("ordena alfabéticamente sin depender del orden de llegada", () => {
    expect(uniqueTextOptions(["c", "a", "b"]).map((o) => o.value)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ordena respetando acentos en vez de mandarlos al final", () => {
    // `localeCompare` (y no un `sort()` por code point) es lo que evita que
    // "Ámbito" caiga después de "Zona" en el desplegable.
    expect(uniqueTextOptions(["Zona", "Ámbito"]).map((o) => o.value)).toEqual([
      "Ámbito",
      "Zona",
    ]);
  });

  it("distingue mayúsculas de minúsculas como valores distintos", () => {
    // Pinning: `ACTIVE` y `active` son códigos distintos para el backend, así
    // que no se colapsan.
    expect(uniqueTextOptions(["ACTIVE", "active"])).toHaveLength(2);
  });

  it("devuelve lista vacía si no hay valores utilizables", () => {
    expect(uniqueTextOptions([])).toEqual([]);
    expect(uniqueTextOptions([null, undefined, ""])).toEqual([]);
  });
});
