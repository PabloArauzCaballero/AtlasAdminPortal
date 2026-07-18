import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/shared/lib/local-search-history";

const STORAGE_KEY = "atlas.recentSearches";

function storedRaw(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("getRecentSearches", () => {
  it("devuelve lista vacía cuando no hay historial", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("devuelve lista vacía si el JSON almacenado está corrupto", () => {
    // Los consumidores hacen `.map(...)`: lanzar aquí tumbaría la caja de
    // búsqueda entera por un valor que otro tab o una versión vieja dejó mal.
    window.localStorage.setItem(STORAGE_KEY, "{no-es-json");

    expect(getRecentSearches()).toEqual([]);
  });

  it("devuelve lista vacía si lo almacenado no es un array", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));

    expect(getRecentSearches()).toEqual([]);
  });

  it("descarta las entradas que no son strings", () => {
    // Un array mixto no debe llegar a la UI: `item.toLowerCase()` reventaría.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["ok", 42, null, { a: 1 }, "bien"]),
    );

    expect(getRecentSearches()).toEqual(["ok", "bien"]);
  });
});

describe("addRecentSearch", () => {
  it("guarda la búsqueda y la devuelve", () => {
    expect(addRecentSearch("clientes")).toEqual(["clientes"]);
    expect(getRecentSearches()).toEqual(["clientes"]);
  });

  it("pone la búsqueda más reciente primero", () => {
    addRecentSearch("uno");
    addRecentSearch("dos");

    expect(getRecentSearches()).toEqual(["dos", "uno"]);
  });

  it("recorta los espacios antes de guardar", () => {
    addRecentSearch("  clientes  ");

    expect(getRecentSearches()).toEqual(["clientes"]);
  });

  it("ignora una búsqueda vacía o de solo espacios", () => {
    addRecentSearch("previa");

    expect(addRecentSearch("")).toEqual(["previa"]);
    expect(addRecentSearch("   ")).toEqual(["previa"]);
    expect(getRecentSearches()).toEqual(["previa"]);
  });

  it("repetir una búsqueda no la duplica: la promueve al principio", () => {
    addRecentSearch("uno");
    addRecentSearch("dos");
    addRecentSearch("uno");

    expect(getRecentSearches()).toEqual(["uno", "dos"]);
  });

  it("la deduplicación ignora mayúsculas y conserva la grafía nueva", () => {
    addRecentSearch("Clientes");
    addRecentSearch("CLIENTES");

    expect(getRecentSearches()).toEqual(["CLIENTES"]);
  });

  it("conserva como máximo 8 entradas, descartando la más vieja", () => {
    for (let index = 1; index <= 10; index += 1) {
      addRecentSearch(`busqueda-${index}`);
    }

    const stored = getRecentSearches();
    expect(stored).toHaveLength(8);
    expect(stored[0]).toBe("busqueda-10");
    // Las dos primeras se cayeron por el tope.
    expect(stored).not.toContain("busqueda-1");
    expect(stored).not.toContain("busqueda-2");
  });

  it("no lanza si el storage rechaza escribir (cuota/modo privado)", () => {
    // Los recientes son un extra: que falle el guardado no puede impedir que el
    // operador busque.
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => addRecentSearch("clientes")).not.toThrow();
    expect(addRecentSearch("clientes")).toEqual(["clientes"]);
  });

  it("guarda un JSON que `getRecentSearches` sabe releer", () => {
    // El ida y vuelta completo: si el formato escrito y el leído divergieran,
    // el historial se vaciaría solo en cada recarga.
    addRecentSearch("clientes");

    expect(JSON.parse(storedRaw() ?? "null")).toEqual(["clientes"]);
  });

  it("acepta unicode y textos muy largos sin truncarlos", () => {
    const long = "á".repeat(500);
    addRecentSearch(long);

    expect(getRecentSearches()[0]).toBe(long);
  });
});

describe("clearRecentSearches", () => {
  it("borra el historial", () => {
    addRecentSearch("clientes");

    clearRecentSearches();

    expect(getRecentSearches()).toEqual([]);
    expect(storedRaw()).toBeNull();
  });

  it("no lanza si no había historial", () => {
    expect(() => clearRecentSearches()).not.toThrow();
  });

  it("no lanza si el storage rechaza borrar", () => {
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => clearRecentSearches()).not.toThrow();
  });
});
