import { describe, expect, it } from "vitest";
import {
  aplicarFiltro,
  camposDeFiltro,
  consultaDeAuditoria,
  filtrosActivos,
  TAMANOS_DE_PAGINA,
} from "@/features/audit/audit-filters";
import type { ActionLogFilterCatalog } from "@/features/systems/types";

/**
 * El estado de los filtros de la auditoría.
 *
 * Aquí no se prueba que se pinten controles: se prueban las tres reglas cuyo
 * incumplimiento deja la tabla vacía sin explicar por qué, que es el peor fallo
 * posible en una pantalla de consulta — se lee como «no hay nada que ver».
 */

const CATALOGO: ActionLogFilterCatalog = {
  fields: [
    {
      name: "method",
      label: "Método HTTP",
      source: "SCHEMA",
      control: "select",
      options: [{ value: "GET", label: "GET" }],
    },
    {
      name: "module",
      label: "Módulo",
      source: "DATA",
      control: "combobox",
      options: [{ value: "customers", label: "customers" }],
    },
  ],
};

describe("los campos vienen del catálogo", () => {
  it("usa los que publica el backend", () => {
    expect(camposDeFiltro(CATALOGO).map((campo) => campo.name)).toEqual([
      "method",
      "module",
    ]);
  });

  it("mientras carga ofrece un mínimo en vez de desaparecer", () => {
    // Una barra que desaparece hace saltar la tabla al llegar el catálogo, y
    // quien estaba escribiendo pierde el foco a mitad de palabra.
    expect(camposDeFiltro(undefined).length).toBeGreaterThan(0);
  });

  it("un catálogo vacío tampoco deja la barra sin nada", () => {
    expect(camposDeFiltro({ fields: [] }).length).toBeGreaterThan(0);
  });
});

describe("aplicar un filtro", () => {
  it("guarda el valor elegido", () => {
    expect(aplicarFiltro({}, "module", "customers")).toEqual({
      module: "customers",
    });
  });

  it("vaciarlo BORRA la clave, no la manda vacía", () => {
    /*
     * `?module=` es un filtro por cadena vacía y el backend, con razón, no
     * devuelve nada. Ése era el camino corto a «limpié el filtro y la tabla se
     * quedó en blanco», que se lee como una avería.
     */
    const conFiltro = { module: "customers", method: "GET" };
    expect(aplicarFiltro(conFiltro, "module", "")).toEqual({ method: "GET" });
  });

  it("un valor de sólo espacios cuenta como vacío", () => {
    expect(aplicarFiltro({ module: "x" }, "module", "   ")).toEqual({});
  });

  it("no muta el estado anterior", () => {
    const previo = { method: "GET" };
    aplicarFiltro(previo, "module", "risk");
    expect(previo).toEqual({ method: "GET" });
  });
});

describe("la consulta que sale hacia el endpoint", () => {
  it("lleva siempre paginación", () => {
    expect(consultaDeAuditoria({}, 3, 50)).toEqual({ page: 3, limit: 50 });
  });

  it("los tamaños ofrecidos caben en el techo del endpoint", () => {
    // El esquema del backend limita `limit` a 100: ofrecer 250 pintaría una
    // opción que responde 400.
    expect(Math.max(...TAMANOS_DE_PAGINA)).toBeLessThanOrEqual(100);
  });

  it("ancla «desde» al principio del día y «hasta» al final", () => {
    /*
     * Con las dos ancladas al inicio, elegir el mismo día en ambas devolvía
     * cero resultados: el rango era de duración nula. Y el control de fecha del
     * navegador entrega `2026-08-16` a secas, que el esquema —`datetime()`—
     * rechaza con un 400 que la pantalla enseñaba como «la auditoría está
     * caída».
     */
    const query = consultaDeAuditoria(
      { from: "2026-08-16", to: "2026-08-16" },
      1,
      25,
    );
    expect(query.from).toBe("2026-08-16T00:00:00.000Z");
    expect(query.to).toBe("2026-08-16T23:59:59.999Z");
  });

  it("respeta una fecha que ya trae hora", () => {
    const query = consultaDeAuditoria(
      { from: "2026-08-16T10:30:00.000Z" },
      1,
      25,
    );
    expect(query.from).toBe("2026-08-16T10:30:00.000Z");
  });

  it("pasa el resto de filtros tal cual", () => {
    expect(
      consultaDeAuditoria({ module: "risk", riskLevel: "HIGH" }, 1, 25),
    ).toEqual({ page: 1, limit: 25, module: "risk", riskLevel: "HIGH" });
  });
});

describe("el recuento de filtros activos", () => {
  it("es lo que decide si ofrecer «Limpiar»", () => {
    expect(filtrosActivos({})).toBe(0);
    expect(filtrosActivos({ module: "risk", method: "GET" })).toBe(2);
  });
});
