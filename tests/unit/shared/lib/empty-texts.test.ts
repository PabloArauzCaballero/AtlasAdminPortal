import { describe, expect, it } from "vitest";
import { emptyTexts } from "@/shared/lib/empty-texts";

const EMPTY = {
  title: "Todavía no hay corridas.",
  description: "Aparecerán aquí cuando se ejecute una suite.",
};

describe("emptyTexts · por qué está vacía una tabla", () => {
  it("sin filtros dice que no hay datos y cuándo aparecerán", () => {
    expect(
      emptyTexts({
        filtered: false,
        empty: EMPTY,
        noMatchTitle: "Ninguna corrida coincide con los filtros.",
      }),
    ).toEqual({
      emptyTitle: "Todavía no hay corridas.",
      emptyDescription: "Aparecerán aquí cuando se ejecute una suite.",
    });
  });

  it("con filtros no dice que no hay datos: dice que ninguno coincide y qué hacer", () => {
    const texto = emptyTexts({
      filtered: true,
      empty: EMPTY,
      noMatchTitle: "Ninguna corrida coincide con los filtros.",
    });

    expect(texto.emptyTitle).toBe("Ninguna corrida coincide con los filtros.");
    expect(texto.emptyDescription).toMatch(/quita o cambia los filtros/i);
    expect(texto.emptyTitle).not.toMatch(/todavía/i);
  });

  it("sin filtros no manda a quitar filtros que no existen", () => {
    const texto = emptyTexts({
      filtered: false,
      empty: EMPTY,
      noMatchTitle: "Ninguna corrida coincide con los filtros.",
    });

    expect(texto.emptyDescription).not.toMatch(/filtros/i);
  });
});
