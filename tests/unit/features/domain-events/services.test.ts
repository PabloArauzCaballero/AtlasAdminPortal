import { describe, expect, it } from "vitest";
import {
  normalizeEventCatalog,
  normalizeEventList,
} from "@/features/domain-events/services";

/**
 * Las dos traducciones que hacían que la pantalla de eventos no se abriera:
 * el listado llega como `{ data, pagination }` (no como array) y el catálogo
 * llama `code` a lo que el listado llama `eventCode`.
 */
describe("normalizeEventList", () => {
  it("convierte { data, pagination } del backend en { items, meta } con el total real", () => {
    const resultado = normalizeEventList(
      {
        data: [{ id: "1", eventCode: "user.registered", status: "pending" }],
        pagination: {
          mode: "offset",
          page: 2,
          limit: 20,
          total: 41,
          totalPages: 3,
        },
      },
      { page: 2, limit: 20 },
    );
    expect(resultado.items).toHaveLength(1);
    expect(resultado.meta).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it("acepta un array pelado sin inventarse un total mayor que lo recibido", () => {
    const resultado = normalizeEventList([{ id: "1" }, { id: "2" }], {
      page: 1,
      limit: 20,
    });
    expect(resultado.items).toHaveLength(2);
    expect(resultado.meta.total).toBe(2);
  });

  it("con una respuesta vacía o rara devuelve cero filas en vez de reventar", () => {
    expect(normalizeEventList(null, { page: 1, limit: 20 }).items).toEqual([]);
    expect(normalizeEventList({ pagination: {} }, {}).items).toEqual([]);
  });
});

describe("normalizeEventCatalog", () => {
  it("traduce code/family/version a los nombres del listado", () => {
    const definiciones = normalizeEventCatalog({
      data: [
        {
          code: "user.registered",
          family: "user_security",
          version: 1,
          description: "Alta",
          defaultPriority: 10,
          allowedAggregateTypes: ["customer"],
        },
      ],
    });
    expect(definiciones).toEqual([
      {
        eventCode: "user.registered",
        family: "user_security",
        version: 1,
        description: "Alta",
        defaultPriority: 10,
        allowedAggregateTypes: ["customer"],
      },
    ]);
  });

  it("descarta las entradas sin código y tolera que ya vengan como eventCode", () => {
    const definiciones = normalizeEventCatalog([
      { eventCode: "loan.disbursed" },
      { description: "sin código" },
    ]);
    expect(definiciones.map((d) => d.eventCode)).toEqual(["loan.disbursed"]);
    expect(definiciones[0].allowedAggregateTypes).toEqual([]);
  });
});
