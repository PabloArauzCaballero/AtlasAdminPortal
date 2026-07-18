import { describe, expect, it } from "vitest";
import {
  moduleExplanations,
  resolveExplanation,
} from "@/shared/content/view-explanations";

describe("resolveExplanation · rutas desconocidas", () => {
  it("devuelve null para una ruta que no pertenece a ningún módulo", () => {
    // La cabecera pinta la explicación solo si hay match: devolver un módulo
    // cualquiera pondría un texto equivocado en una vista ajena.
    expect(resolveExplanation("/login")).toBeNull();
    expect(resolveExplanation("/")).toBeNull();
    expect(resolveExplanation("/externo/cualquier-cosa")).toBeNull();
  });

  it("devuelve null para la cadena vacía", () => {
    expect(resolveExplanation("")).toBeNull();
  });
});

describe("resolveExplanation · gana el prefijo más largo", () => {
  it("una vista más específica gana a la vista general del módulo", () => {
    // `/internal/systems/tools/health` matchea tanto `/internal/systems/tools`
    // como `/internal/systems/tools/health`: debe ganar la segunda.
    const resolved = resolveExplanation("/internal/systems/tools/health");

    expect(resolved?.module.module).toBe("Systems Ops");
    expect(resolved?.view?.systems).toContain("Estado vivo por herramienta");
  });

  it("un módulo con prefijo más largo gana a otro módulo que también matchea", () => {
    // `/internal/operations/catalogs` pertenece a "Catálogo y metadata", pero
    // "Operaciones" declara el prefijo más corto `/internal/operations`. Si
    // ganara el más corto, la ficha de catálogos mostraría la explicación del
    // módulo equivocado.
    const resolved = resolveExplanation("/internal/operations/catalogs");

    expect(resolved?.module.module).toBe("Catálogo y metadata");
  });

  it("una ruta hermana bajo el prefijo corto sigue resolviendo a su módulo", () => {
    // El complemento del test anterior: `/internal/operations/work-queue` no
    // cae bajo `/internal/operations/catalogs` y debe quedarse en Operaciones.
    const resolved = resolveExplanation("/internal/operations/work-queue");

    expect(resolved?.module.module).toBe("Operaciones");
    expect(resolved?.view).not.toBeNull();
  });

  it("una subruta profunda hereda la vista de su prefijo", () => {
    // El detalle de un endpoint (`/internal/systems/endpoints/ep_123`) no
    // declara vista propia: debe heredar la del listado, no quedarse sin nada.
    const resolved = resolveExplanation("/internal/systems/endpoints/ep_123");

    expect(resolved?.module.module).toBe("Systems Ops");
    expect(resolved?.view?.systems).toContain("Lista paginada del catálogo");
  });

  it("una ruta de módulo sin vista propia resuelve módulo con view null", () => {
    // `/internal/systems` matchea el módulo pero ninguna de sus vistas.
    const resolved = resolveExplanation("/internal/systems");

    expect(resolved?.module.module).toBe("Systems Ops");
    expect(resolved?.view).toBeNull();
  });
});

describe("view-explanations · integridad de la configuración", () => {
  it("toda vista declarada resuelve a su propio módulo y a sí misma", () => {
    // Una vista cuyo prefijo pertenece (por longitud) a OTRO módulo es config
    // muerta: nunca se pinta y nadie se entera, porque no falla nada.
    for (const moduleEntry of moduleExplanations) {
      for (const [prefix, view] of Object.entries(moduleEntry.views)) {
        const resolved = resolveExplanation(prefix);

        expect(
          resolved?.module.module,
          `la vista "${prefix}" de "${moduleEntry.module}" resuelve a otro módulo`,
        ).toBe(moduleEntry.module);
        expect(
          resolved?.view,
          `la vista "${prefix}" de "${moduleEntry.module}" no se alcanza nunca`,
        ).toBe(view);
      }
    }
  });

  it("toda vista declarada cae bajo algún prefijo de su módulo", () => {
    // Guardarraíl estático del mismo problema: detecta el error de config aun
    // si el resolver cambiara de estrategia.
    for (const moduleEntry of moduleExplanations) {
      for (const prefix of Object.keys(moduleEntry.views)) {
        const owned = moduleEntry.prefixes.some((modulePrefix) =>
          prefix.startsWith(modulePrefix),
        );
        expect(
          owned,
          `"${prefix}" no cuelga de ningún prefijo de "${moduleEntry.module}"`,
        ).toBe(true);
      }
    }
  });

  it("ningún prefijo de módulo está declarado por dos módulos", () => {
    // Dos módulos con el mismo prefijo hacen que gane el orden del array: la
    // explicación dependería de en qué archivo se declaró primero.
    const seen = new Map<string, string>();

    for (const moduleEntry of moduleExplanations) {
      for (const prefix of moduleEntry.prefixes) {
        const previous = seen.get(prefix);
        expect(
          previous,
          `"${prefix}" lo declaran "${previous}" y "${moduleEntry.module}"`,
        ).toBeUndefined();
        seen.set(prefix, moduleEntry.module);
      }
    }
  });

  it("todo módulo tiene prefijos y textos no vacíos", () => {
    // La cabecera pinta ambos textos: uno vacío deja un hueco en la UI.
    for (const moduleEntry of moduleExplanations) {
      expect(moduleEntry.prefixes.length).toBeGreaterThan(0);
      expect(moduleEntry.module.trim()).not.toBe("");
      expect(moduleEntry.systems.trim()).not.toBe("");
      expect(moduleEntry.business.trim()).not.toBe("");
    }
  });

  it("toda vista tiene explicación de sistemas y de negocio", () => {
    for (const moduleEntry of moduleExplanations) {
      for (const [prefix, view] of Object.entries(moduleEntry.views)) {
        expect(
          view.systems.trim(),
          `"${prefix}" sin texto de sistemas`,
        ).not.toBe("");
        expect(
          view.business.trim(),
          `"${prefix}" sin texto de negocio`,
        ).not.toBe("");
      }
    }
  });

  it("todo prefijo de módulo empieza por `/internal`", () => {
    // Las explicaciones solo se pintan dentro del shell interno: un prefijo
    // fuera de ahí sería inalcanzable.
    for (const moduleEntry of moduleExplanations) {
      for (const prefix of moduleEntry.prefixes) {
        expect(prefix.startsWith("/internal"), `"${prefix}"`).toBe(true);
      }
    }
  });

  it("agrega los módulos primarios y secundarios en una sola lista", () => {
    // Si un archivo dejara de agregarse, sus rutas devolverían null en silencio.
    const names = moduleExplanations.map((entry) => entry.module);

    expect(names).toContain("Systems Ops");
    expect(names).toContain("Operaciones");
    expect(names).toContain("Administración");
    expect(new Set(names).size).toBe(names.length);
  });
});
