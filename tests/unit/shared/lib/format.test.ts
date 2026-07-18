import { describe, expect, it } from "vitest";
import {
  formatBoolean,
  formatDateTime,
  formatNumber,
  humanizeKey,
  objectEntries,
  safeText,
} from "@/shared/lib/format";

const EM_DASH = "—";

describe("humanizeKey", () => {
  it("separa camelCase en palabras conservando la mayúscula del corte", () => {
    // El corte inserta un espacio pero NO baja la caja: `backendService` queda
    // "Backend Service", no "Backend service".
    expect(humanizeKey("backendService")).toBe("Backend Service");
    expect(humanizeKey("reviewStatus")).toBe("Review Status");
  });

  it("solo capitaliza la primera palabra cuando la clave no es camelCase", () => {
    // Pinning de una inconsistencia real: `reviewStatus` -> "Review Status" pero
    // `review_status` -> "Review status". La etiqueta de una misma columna
    // depende de cómo la nombre el backend.
    expect(humanizeKey("review_status")).toBe("Review status");
    expect(humanizeKey("reviewStatus")).toBe("Review Status");
  });

  it("convierte snake_case y kebab-case en palabras", () => {
    expect(humanizeKey("review_status")).toBe("Review status");
    expect(humanizeKey("review-status")).toBe("Review status");
    expect(humanizeKey("data__quality--rule")).toBe("Data quality rule");
  });

  it("corta el camelCase también después de un dígito", () => {
    // Claves como `api2Version` salen del catálogo del backend.
    expect(humanizeKey("api2Version")).toBe("Api2 Version");
  });

  it("no parte siglas consecutivas", () => {
    // `PIIFlag` no debe volverse "P I I Flag": el corte es minúscula->mayúscula.
    expect(humanizeKey("PIIFlag")).toBe("PIIFlag");
    expect(humanizeKey("isPII")).toBe("Is PII");
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(humanizeKey("  review   status  ")).toBe("Review status");
    expect(humanizeKey("_review_status_")).toBe("Review status");
  });

  it("devuelve cadena vacía para entrada vacía, sin reventar", () => {
    // El `.replace(/^./)` no matchea nada: no debe lanzar.
    expect(humanizeKey("")).toBe("");
    expect(humanizeKey("   ")).toBe("");
  });

  it("no rompe caracteres no ASCII al capitalizar", () => {
    expect(humanizeKey("ámbito_de_riesgo")).toBe("Ámbito de riesgo");
  });
});

describe("formatBoolean", () => {
  it("distingue false de ausencia de valor", () => {
    // Es la garantía central: pintar "—" cuando el backend dijo `false` haría
    // creer al operador que el dato falta, no que el flag está apagado.
    expect(formatBoolean(false)).toBe("No");
    expect(formatBoolean(null)).toBe(EM_DASH);
    expect(formatBoolean(undefined)).toBe(EM_DASH);
  });

  it("pinta true como Sí", () => {
    expect(formatBoolean(true)).toBe("Sí");
  });
});

describe("formatDateTime", () => {
  it("formatea una fecha ISO válida", () => {
    const formatted = formatDateTime("2026-07-17T15:30:45.000Z");
    // Se comprueba que produce algo con estructura de fecha+hora en vez de
    // fijar el literal: depende del timezone del runner.
    expect(formatted).toMatch(
      /\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}:\d{2}/,
    );
    expect(formatted).not.toBe(EM_DASH);
  });

  it("devuelve guion para valores ausentes", () => {
    expect(formatDateTime(null)).toBe(EM_DASH);
    expect(formatDateTime(undefined)).toBe(EM_DASH);
    expect(formatDateTime("")).toBe(EM_DASH);
  });

  it("devuelve el valor crudo si no es una fecha parseable", () => {
    // Preferible a "Invalid Date": al menos el operador ve qué mandó el backend.
    expect(formatDateTime("no-soy-una-fecha")).toBe("no-soy-una-fecha");
    expect(formatDateTime("2026-13-45")).toBe("2026-13-45");
  });

  it("formatea la misma marca temporal de forma estable", () => {
    // Sin esto, una función que dependiera de `Date.now()` pasaría inadvertida.
    expect(formatDateTime("2026-01-01T00:00:00.000Z")).toBe(
      formatDateTime("2026-01-01T00:00:00.000Z"),
    );
  });
});

describe("formatNumber", () => {
  it("agrupa los miles en vez de escupir el número crudo", () => {
    // El separador concreto depende de la versión de ICU del runner; lo que se
    // fija es que agrupa de tres en tres, no cuál es el carácter.
    expect(formatNumber(1234567)).toMatch(/^1\D?234\D?567$/);
  });

  it("distingue el cero de la ausencia de valor", () => {
    // `0` es falsy: un guard con `!value` lo pintaría como "—" y el operador
    // leería "sin dato" donde el backend dijo "cero".
    expect(formatNumber(0)).toBe("0");
  });

  it("devuelve guion para null, undefined y cadena vacía", () => {
    expect(formatNumber(null)).toBe(EM_DASH);
    expect(formatNumber(undefined)).toBe(EM_DASH);
    expect(formatNumber("")).toBe(EM_DASH);
  });

  it("acepta números que llegan como string", () => {
    expect(formatNumber("42")).toBe("42");
    expect(formatNumber("3.5")).toMatch(/^3[.,]5$/);
  });

  it("devuelve el valor crudo si no es numérico", () => {
    expect(formatNumber("N/A")).toBe("N/A");
    expect(formatNumber(Number.NaN)).toBe("NaN");
  });

  it("no pierde el signo de un negativo", () => {
    // Un delta de -5 pintado como "5" invierte la lectura del dato. El glifo
    // del signo lo decide ICU, así que solo se exige que esté y no se confunda
    // con el positivo.
    expect(formatNumber(-5)).not.toBe(formatNumber(5));
    expect(formatNumber(-5)).toMatch(/5$/);
    expect(formatNumber(-5).length).toBeGreaterThan(1);
  });

  it("no colapsa un entero grande a notación científica", () => {
    // Un contador de filas de 9 dígitos debe leerse, no salir como 1.23e+8.
    expect(formatNumber(123456789)).not.toContain("e");
  });
});

describe("safeText", () => {
  it("distingue el cero y el false de la ausencia de valor", () => {
    // Ambos son falsy: un guard con `!value` los borraría de la tabla.
    expect(safeText(0)).toBe("0");
    expect(safeText(false)).toBe("false");
  });

  it("devuelve guion para null, undefined y cadena vacía", () => {
    expect(safeText(null)).toBe(EM_DASH);
    expect(safeText(undefined)).toBe(EM_DASH);
    expect(safeText("")).toBe(EM_DASH);
  });

  it("devuelve los strings tal cual, sin comillas de JSON", () => {
    expect(safeText("hola")).toBe("hola");
  });

  it("serializa objetos y arrays a JSON", () => {
    expect(safeText({ a: 1 })).toBe('{"a":1}');
    expect(safeText([1, 2])).toBe("[1,2]");
  });

  it("serializa un objeto anidado sin aplanarlo", () => {
    expect(safeText({ a: { b: [1, null] } })).toBe('{"a":{"b":[1,null]}}');
  });
});

describe("objectEntries", () => {
  it("devuelve lista vacía para null y undefined", () => {
    // Los consumidores hacen `.map(...)` directo: devolver undefined reventaría.
    expect(objectEntries(null)).toEqual([]);
    expect(objectEntries(undefined)).toEqual([]);
  });

  it("devuelve los pares clave/valor de un objeto", () => {
    expect(objectEntries({ a: 1, b: "x" })).toEqual([
      ["a", 1],
      ["b", "x"],
    ]);
  });

  it("conserva las claves con valor falsy", () => {
    // Filtrar por valor escondería flags apagados en el detalle.
    expect(objectEntries({ a: 0, b: false, c: null })).toEqual([
      ["a", 0],
      ["b", false],
      ["c", null],
    ]);
  });

  it("devuelve lista vacía para un objeto sin claves", () => {
    expect(objectEntries({})).toEqual([]);
  });
});
