import { describe, expect, it } from "vitest";
import {
  normalizeForSearch,
  optionLabel,
  optionsToDescriptions,
  uniqueTextOptions,
} from "@/shared/lib/options";

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

describe("uniqueTextOptions · descripciones de dominio", () => {
  const MAPA = {
    ACTIVE: {
      label: "Activo",
      description: "Sigue operando y acepta tráfico real.",
    },
    PAUSED: "Detenido a mano; ninguna llamada llega al proveedor.",
  };

  it("los valores conocidos toman etiqueta y descripción del mapa", () => {
    expect(uniqueTextOptions(["ACTIVE"], MAPA)).toEqual([
      {
        value: "ACTIVE",
        label: "Activo",
        description: "Sigue operando y acepta tráfico real.",
      },
    ]);
  });

  it("un texto suelto en el mapa es la descripción, y la etiqueta sigue siendo el código", () => {
    expect(uniqueTextOptions(["PAUSED"], MAPA)).toEqual([
      {
        value: "PAUSED",
        label: "PAUSED",
        description: "Detenido a mano; ninguna llamada llega al proveedor.",
      },
    ]);
  });

  it("lo que NO está en el mapa va sin descripción: un texto inventado sería peor", () => {
    // Los filtros derivados de los datos traen códigos que nadie ha documentado (un `tenantId`,
    // un nombre de tabla). Describirlos «por si acaso» sería adivinar.
    expect(uniqueTextOptions(["RARO"], MAPA)).toEqual([
      { value: "RARO", label: "RARO" },
    ]);
  });
});

describe("optionsToDescriptions", () => {
  it("convierte un catálogo en el mapa que espera uniqueTextOptions", () => {
    expect(
      optionsToDescriptions([
        { value: "A", label: "Alta", description: "Se atiende el mismo día." },
        { value: "B", label: "Baja" },
      ]),
    ).toEqual({
      A: { label: "Alta", description: "Se atiende el mismo día." },
    });
  });
});

describe("normalizeForSearch", () => {
  it("quita tildes y baja a minúsculas: «facturacion» encuentra «Facturación»", () => {
    expect(normalizeForSearch("  Facturación ")).toBe("facturacion");
  });
});

describe("optionLabel", () => {
  const OPCIONES = [{ value: "A", label: "Alta" }];

  it("devuelve la etiqueta del catálogo", () => {
    expect(optionLabel(OPCIONES, "A")).toBe("Alta");
  });

  it("un valor desconocido se enseña tal cual, no en blanco", () => {
    expect(optionLabel(OPCIONES, "Z")).toBe("Z");
  });

  it("sin valor no inventa nada", () => {
    expect(optionLabel(OPCIONES, null)).toBe("");
  });
});
