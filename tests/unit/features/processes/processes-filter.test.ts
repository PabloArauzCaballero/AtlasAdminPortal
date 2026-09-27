import { describe, expect, it } from "vitest";
import {
  EMPTY_PROCESS_FILTERS,
  filterProcesses,
} from "@/features/processes/filter";
import { makeItem } from "./fixtures";

const items = [
  makeItem(),
  makeItem({
    processId: "P-16",
    code: "partner_onboarding",
    name: "Alta de comercio",
    processType: "partner_journey",
    priority: "P1",
    systems: ["ATLAS_BACKEND", "ERP_BACKEND"],
    documentation: {
      ...makeItem().documentation,
      narrative: false,
      complete: false,
    },
    wiring: { wired: 1, unwired: 2, unknown: 0, personSteps: 3 },
  }),
  makeItem({
    processId: "P-30",
    code: "review_queue",
    name: "Cola de revisión",
    priority: "P2",
    wiring: { wired: 0, unwired: 0, unknown: 1, personSteps: 1 },
  }),
];

const run = (filters: Partial<typeof EMPTY_PROCESS_FILTERS>, page = 1) =>
  filterProcesses(
    items,
    { ...EMPTY_PROCESS_FILTERS, ...filters },
    page,
  ).items.map((item) => item.processId);

describe("filterProcesses", () => {
  it("sin filtros devuelve todo, con meta de paginación", () => {
    const result = filterProcesses(items, EMPTY_PROCESS_FILTERS, 1);
    expect(result.items).toHaveLength(3);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it("busca sin tildes ni mayúsculas, también por número de proceso", () => {
    expect(run({ q: "revision" })).toEqual(["P-30"]);
    expect(run({ q: "p-16" })).toEqual(["P-16"]);
  });

  it("filtra por tipo, bloque y prioridad", () => {
    expect(run({ processType: "partner_journey" })).toEqual(["P-16"]);
    expect(run({ system: "ERP_BACKEND" })).toEqual(["P-16"]);
    expect(run({ priority: "P2" })).toEqual(["P-30"]);
  });

  it("«totalmente cableado» excluye los pasos sin pantalla Y los sin comprobar", () => {
    expect(run({ status: "wired" })).toEqual(["P-01"]);
    expect(run({ status: "unwired" })).toEqual(["P-16"]);
    expect(run({ status: "undocumented" })).toEqual(["P-16"]);
    expect(run({ status: "documented" })).toEqual(["P-01", "P-30"]);
  });

  it("pagina y nunca devuelve una página fuera de rango", () => {
    const result = filterProcesses(items, EMPTY_PROCESS_FILTERS, 9, 2);
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(result.items.map((item) => item.processId)).toEqual(["P-30"]);
  });
});
