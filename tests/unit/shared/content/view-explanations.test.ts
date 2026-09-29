import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  matchesPrefix,
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
    // `/internal/flows/review` matchea tanto `/internal/flows` como
    // `/internal/flows/review`: debe ganar la segunda.
    const resolved = resolveExplanation("/internal/flows/review");

    expect(resolved?.module.module).toBe("Systems Ops");
    expect(resolved?.view?.systems).toContain("Los flujos de riesgo alto");
  });

  it("un módulo con prefijo más largo gana a otro módulo que también matchea", () => {
    // `/internal/operations/catalogs` pertenece a "Catálogo y metadatos", pero
    // "Operaciones" declara el prefijo más corto `/internal/operations`. Si
    // ganara el más corto, la ficha de catálogos mostraría la explicación del
    // módulo equivocado.
    const resolved = resolveExplanation("/internal/operations/catalogs");

    expect(resolved?.module.module).toBe("Catálogo y metadatos");
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
    expect(resolved?.view?.systems).toContain(
      "Lista de todas las operaciones del inventario",
    );
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

  it("ningún texto enseña tripas del código: rutas de la API, backticks, nombres internos", () => {
    // El panel lo lee gente de operaciones. «`system_endpoint_catalog`», «GET /v1/…» o «el
    // backend» no le dicen nada y hacen parecer la pantalla una nota para programadores.
    const jerga =
      /`|\b(GET|POST|PATCH|PUT|DELETE) \/|backend|payload|tenant|\bseeds?\b|@Roles|Controller\b|[a-z]+_[a-z_]+/;
    for (const moduleEntry of moduleExplanations) {
      const textos = [
        ["módulo", moduleEntry.systems, moduleEntry.business],
        ...Object.entries(moduleEntry.views).map(([prefix, view]) => [
          prefix,
          view.systems,
          view.business,
        ]),
      ];
      for (const [donde, ...partes] of textos) {
        for (const texto of partes) {
          expect(texto, `${moduleEntry.module} · ${donde}`).not.toMatch(jerga);
        }
      }
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

describe("view-explanations · cobertura de las pantallas del portal", () => {
  /** Las dos pantallas públicas no montan el armazón y por eso no pintan explicación. */
  const PUBLICAS = new Set(["/internal/login", "/internal/recuperar-acceso"]);

  /**
   * Una ruta vieja conservada tras fusionar pantallas sólo llama a `redirect()`: no pinta nada, así
   * que no es una pantalla que necesite explicación (la tiene su destino). Vale cualquiera de las dos
   * formas en que se escriben: `redirect(` al inicio de línea sin `return (<`, o `redirect(` sin JSX.
   */
  function esRedireccion(archivo: string): boolean {
    const fuente = readFileSync(archivo, "utf8");
    const formaA =
      /^\s*redirect\(/m.test(fuente) && !/return\s*\(?\s*</.test(fuente);
    const formaB = /\bredirect\(/.test(fuente) && !/<[A-Za-z]/.test(fuente);
    return formaA || formaB;
  }

  function rutasDelPortal(dir: string, base: string): string[] {
    const rutas: string[] = [];
    for (const entrada of readdirSync(dir)) {
      const ruta = path.join(dir, entrada);
      if (statSync(ruta).isDirectory()) {
        rutas.push(...rutasDelPortal(ruta, base));
      } else if (entrada === "page.tsx" && !esRedireccion(ruta)) {
        const relativa = path.relative(base, path.dirname(ruta));
        // Un segmento dinámico (`[caseId]`) se prueba con un valor cualquiera.
        rutas.push(
          `/${relativa.split(path.sep).join("/")}`.replace(/\[[^\]]+\]/g, "1"),
        );
      }
    }
    return rutas;
  }

  it("toda pantalla interna tiene explicación de su vista, no sólo del módulo", () => {
    // T4.3 del plan de procesos (2026-09-26): 20 pantallas salían sin texto o con el del módulo
    // a secas. Esta prueba impide que una pantalla nueva vuelva a nacer muda.
    const appDir = path.resolve("src/app");
    const sinTexto = rutasDelPortal(path.join(appDir, "internal"), appDir)
      .filter((ruta) => !PUBLICAS.has(ruta))
      .filter((ruta) => !resolveExplanation(ruta)?.view);

    expect(sinTexto).toEqual([]);
  });

  it("la portada sólo explica la portada: su prefijo es la raíz y no se apropia de otras", () => {
    expect(resolveExplanation("/internal")?.module.module).toBe("Inicio");
    expect(resolveExplanation("/internal/no-existe")).toBeNull();
  });

  it("las campañas dicen que se crean en el ERP", () => {
    const resolved = resolveExplanation("/internal/notifications/campaigns/12");

    expect(resolved?.module.module).toBe("Operaciones");
    expect(resolved?.view?.business).toContain("ERP");
  });

  it("los textos nuevos no hablan de «backend» ni de «endpoint»", () => {
    const nuevas = [
      "/internal",
      "/internal/search",
      "/internal/flows",
      "/internal/support",
      "/internal/views",
      "/internal/merchant-users",
      "/internal/events",
      "/internal/external-data",
      "/internal/operations/partners",
      "/internal/operations/portfolio",
      "/internal/qa/aprender",
      "/internal/settings/partner-contracts",
      "/internal/notifications/campaigns",
    ];
    for (const ruta of nuevas) {
      const view = resolveExplanation(ruta)?.view;
      const texto = `${view?.business ?? ""} ${view?.systems ?? ""}`;
      expect(texto, ruta).not.toMatch(/backend|endpoint/i);
    }
  });
});

describe("resolveExplanation · segmentos dinámicos", () => {
  it("la ficha de un proceso tiene texto propio aunque el código cambie, y explica sus casos", () => {
    const lista = resolveExplanation("/internal/procesos");
    const ficha = resolveExplanation(
      "/internal/procesos/account_signup_to_login",
    );

    expect(lista?.module.module).toBe("Procesos");
    expect(ficha?.module.module).toBe("Procesos");
    expect(new Set([lista?.view, ficha?.view]).size).toBe(2);
    // Los casos son una pestaña de la ficha desde la fusión de «Procesos ×3».
    expect(ficha?.view?.business).toContain("casos");
  });

  it("un corchete sólo cubre un segmento que existe", () => {
    expect(
      matchesPrefix("/internal/procesos", "/internal/procesos/[code]"),
    ).toBe(false);
    expect(
      matchesPrefix("/internal/procesos/", "/internal/procesos/[code]"),
    ).toBe(false);
    expect(
      matchesPrefix("/internal/procesos/x", "/internal/procesos/[code]"),
    ).toBe(true);
  });
});
